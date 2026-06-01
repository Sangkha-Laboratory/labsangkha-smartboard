import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// HMAC-SHA256 signature verification helper
async function verifyLineSignature(bodyText: string, signature: string, channelSecret: string): Promise<boolean> {
  if (!signature || !channelSecret) return false;
  try {
    const keyBuf = new TextEncoder().encode(channelSecret);
    const dataBuf = new TextEncoder().encode(bodyText);

    const key = await crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuf = await crypto.subtle.sign("HMAC", key, dataBuf);
    
    // Convert signature array buffer to standard base64 string
    const hashArray = new Uint8Array(signatureBuf);
    let binary = "";
    for (let i = 0; i < hashArray.byteLength; i++) {
      binary += String.fromCharCode(hashArray[i]);
    }
    const expectedSignature = btoa(binary);
    return expectedSignature === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// Fetch LINE user profile helper
async function getLineUserProfile(userId: string, groupId: string, accessToken: string): Promise<{ displayName: string }> {
  try {
    // Try member API first if in group
    let url = `https://api.line.me/v2/bot/profile/${userId}`;
    if (groupId) {
      url = `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`;
    }

    console.log(`Fetching profile from: ${url}`);
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      console.log("LINE user profile loaded:", JSON.stringify(data));
      return { displayName: data.displayName || "เจ้าหน้าที่" };
    } else {
      console.warn(`LINE Profile API returned status ${res.status}. Falling back to default profile.`);
      // Retry using global profile API if group member failed
      if (groupId) {
        const retryRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          return { displayName: data.displayName || "เจ้าหน้าที่" };
        }
      }
    }
  } catch (err) {
    console.error("Failed to load LINE user profile:", err);
  }
  return { displayName: "เจ้าหน้าที่" };
}

// Utility to push text message to LINE group
async function pushLineMessage(to: string, text: string, accessToken: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      to,
      messages: [
        {
          type: "text",
          text: text
        }
      ]
    })
  });
  console.log(`Push text response: ${res.status}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // Retrieve environment variables
  const lineSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  const lineAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!lineSecret || !lineAccessToken || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required env configuration variables!");
    return new Response(JSON.stringify({ error: "Missing server environment configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    console.log("LINE Signature verification start...");
    const isVerified = await verifyLineSignature(rawBody, signature, lineSecret);
    if (!isVerified) {
      console.warn("Invalid x-line-signature header! Signature validation failed.");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log("LINE Signature verification passed.");

    const body = JSON.parse(rawBody);
    const events = body.events || [];
    if (events.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No events to process" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Lazy load Supabase instance
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "handover_sys" }
    });

    for (const event of events) {
      const type = event.type;
      const groupId = event.source?.groupId;
      const userId = event.source?.userId;

      console.log(`Processing event type: ${type} from source group: ${groupId || "none"}`);

      // A) Handle "join" event type
      if (type === "join" && groupId) {
        console.log(`LINE Bot joined group: ${groupId}. Saving group state.`);
        const { error } = await supabase.rpc("save_line_group", { p_group_id: groupId });
        
        if (error) {
          console.error("RPC save_line_group failed:", error);
        } else {
          // Greeting text when joining the channel
          await pushLineMessage(
            groupId, 
            "สวัสดีครับ! 🏥🤖 ระบบรับ-ส่งมอบเวร กลุ่มงานเทคนิคการแพทย์ ยินดีให้บริการบันทึกพิกัดและประสานงานร่วมกับกลุ่มนี้อย่างถูกต้องเรียบร้อยแล้ว", 
            lineAccessToken
          );
        }
      }

      // Handle "postback" event type
      if (type === "postback") {
        const postbackData = event.postback?.data || "";
        console.log(`Postback received data: ${postbackData}`);
        const params = new URLSearchParams(postbackData);
        const action = params.get("action");

        // B) action = accept_all
        if (action === "accept_all") {
          const handoverId = params.get("handoverId") || params.get("taskId");
          if (!handoverId) {
            console.warn("Missing handoverId or taskId in accept_all request");
            continue;
          }

          console.log(`Action accept_all triggered for handover ID: ${handoverId}`);
          
          // Get user details
          const { displayName } = await getLineUserProfile(userId, groupId, lineAccessToken);
          
          // 1. Fetch reference task
          const { data: refTask, error: refError } = await supabase
            .from('handovers')
            .select('*')
            .eq('id', handoverId)
            .single();

          if (refError || !refTask) {
            console.error("Reference task not found for accept_all:", refError);
            continue;
          }

          // 2. Identify all tasks in same batch (+/- 5 seconds)
          const targetTime = new Date(refTask.created_at).getTime();
          const lowerBound = new Date(targetTime - 5000).toISOString();
          const upperBound = new Date(targetTime + 5000).toISOString();

          // Try to look up a registered user by name to match their UUID
          let registeredUserId: string | null = null;
          try {
            const { data: matchedUsers } = await supabase
              .from('users')
              .select('id')
              .eq('full_name', displayName)
              .limit(1);
            if (matchedUsers && matchedUsers.length > 0) {
              registeredUserId = matchedUsers[0].id;
            }
          } catch (err) {
            console.warn("Failed to lookup registering user ID in webhook:", err);
          }

          // 3. Update all pending items in this batch to Accepted
          const { data: updatedBatch, error: updateError } = await supabase
            .from('handovers')
            .update({
              status: 'Accepted',
              receiver_id: registeredUserId,
              receiver_line_name: displayName,
              accepted_at: new Date().toISOString()
            })
            .eq('sender_id', refTask.sender_id)
            .eq('division', refTask.division)
            .gte('created_at', lowerBound)
            .lte('created_at', upperBound)
            .eq('status', 'Pending')
            .select();

          if (updateError) {
            console.error("Failed to update batch handovers in accept_all:", updateError);
          }

          // Also execute legacy RPC just in case they have legacy column
          await supabase.rpc("accept_handover_from_line", {
            p_handover_id: handoverId,
            p_line_display_name: displayName,
            p_line_user_id: userId
          }).catch((e: any) => console.warn("Legacy RPC error:", e));

          // Post success text response to group
          const taskCount = updatedBatch ? updatedBatch.length : 1;
          const responseText = `🏥 ${displayName} ได้กด "รับงานทั้งหมด" สำเร็จ\nจำนวน ${taskCount} รายการเรียบร้อยแล้ว`;
          await pushLineMessage(groupId || userId, responseText, lineAccessToken);
        }

        // C) action = select
        if (action === "select") {
          const handoverId = params.get("handoverId") || params.get("taskId");
          if (!handoverId) {
            console.warn("Missing handoverId or taskId in select request");
            continue;
          }

          console.log(`Action select (carousel fallback to LIFF) triggered for handover ID: ${handoverId}`);

          const liffId = Deno.env.get("LINE_LIFF_ID") || "2010256621-suCeCNrD";
          const liffUrl = `https://liff.line.me/${liffId}?handover_id=${handoverId}`;

          const helpFlexMessage = {
            type: "flex",
            altText: "เลือกรองรับงานผ่านระบบ LIFF",
            contents: {
              type: "bubble",
              size: "mega",
              body: {
                type: "box",
                layout: "vertical",
                paddingAll: "lg",
                backgroundColor: "#ffffff",
                contents: [
                  {
                    type: "text",
                    text: "📋 เลือกรับรายการงาน",
                    weight: "bold",
                    size: "md",
                    color: "#1A1A2E"
                  },
                  {
                    type: "text",
                    text: "กรุณากดปุ่มด้านล่างเพื่อระบุชื่อผู้รับงาน และกดยืนยันเลือกรับรายการย่อยทางแพลตฟอร์ม LIFF ได้อย่างสะดวกปลอดภัยครับ",
                    size: "xs",
                    color: "#6B7280",
                    margin: "md",
                    wrap: true
                  }
                ]
              },
              footer: {
                type: "box",
                layout: "vertical",
                paddingAll: "md",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#2B8BE8",
                    height: "sm",
                    action: {
                      type: "uri",
                      label: "เปิดหน้าต่างรับงาน (LIFF)",
                      uri: liffUrl
                    }
                  }
                ]
              }
            }
          };

          // Post Flex Message response
          const res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${lineAccessToken}`
            },
            body: JSON.stringify({
              to: groupId || userId,
              messages: [helpFlexMessage]
            })
          });
          console.log(`Select LIFF fallback push response: ${res.status}`);
        }

        // D) action = accept_one
        if (action === "accept_one") {
          const handoverId = params.get("handoverId");
          const indexStr = params.get("index");

          if (!handoverId || indexStr === null) {
            console.warn("Missing critical task identifier metadata in accept_one request");
            continue;
          }

          const index = parseInt(indexStr, 10);
          console.log(`Action accept_one triggered for handover ID ${handoverId} at index ${index}`);

          // Fetch member profile details
          const { displayName } = await getLineUserProfile(userId, groupId, lineAccessToken);

          // Update the specific task database state
          const { data: rpcResult, error: dbErr } = await supabase.rpc("accept_one_task", {
            p_handover_id: handoverId,
            p_task_index: index,
            p_line_display_name: displayName,
            p_line_user_id: userId
          });

          if (dbErr || !rpcResult) {
            console.error("Database accept_one_task RPC failed:", dbErr);
            continue;
          }

          const { all_done, remaining, task_title } = rpcResult;

          // Compile reply response message depending on task completeness status
          let responseText = "";
          if (remaining > 0) {
            responseText = `${displayName} รับงานแล้ว\n${task_title}\nเหลืออีก ${remaining} งาน รอการรับ`;
          } else {
            responseText = `${displayName} รับงานแล้ว\n${task_title}\nรับงานครบทุกรายการแล้ว`;
          }

          await pushLineMessage(groupId || userId, responseText, lineAccessToken);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Critical error inside handle-line-webhook Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
