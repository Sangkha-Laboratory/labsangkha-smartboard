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
          
          // Accept the entire handover in database
          const { error: dbErr } = await supabase.rpc("accept_handover_from_line", {
            p_handover_id: handoverId,
            p_line_display_name: displayName,
            p_line_user_id: userId
          });

          if (dbErr) {
            console.error("Database accept_handover_from_line RPC failed:", dbErr);
            continue;
          }

          // Fetch the total task number
          const { data: taskCount, error: countErr } = await supabase.rpc("get_task_number", {
            p_handover_id: handoverId
          });

          if (countErr) {
            console.error("Database get_task_number RPC failed:", countErr);
          }

          // Post success text response to group
          const responseText = `${displayName} รับงานแล้ว\n${taskCount || 0} รายการ\nรับงานครบทุกรายการแล้ว`;
          await pushLineMessage(groupId || userId, responseText, lineAccessToken);
        }

        // C) action = select
        if (action === "select") {
          const handoverId = params.get("handoverId") || params.get("taskId");
          if (!handoverId) {
            console.warn("Missing handoverId or taskId in select request");
            continue;
          }

          console.log(`Action select (carousel) triggered for handover ID: ${handoverId}`);

          // Fetch the tasks for this handover
          const { data: handover, error: dbErr } = await supabase
            .from("handovers")
            .select("tasks")
            .eq("id", handoverId)
            .single();

          if (dbErr || !handover) {
            console.error("Failed to load tasks from DB for carousel:", dbErr);
            continue;
          }

          const tasks = handover.tasks || [];
          if (!Array.isArray(tasks) || tasks.length === 0) {
            await pushLineMessage(groupId || userId, "ไม่พบรายการงานค้างในระบบสำหรับเวรนี้", lineAccessToken);
            continue;
          }

          // Build Flex Message type: carousel
          const bubbles = tasks.map((task: any, index: number) => {
            const isUnread = String(task.status).toLowerCase() === "pending";
            
            return {
              type: "bubble",
              size: "micro",
              body: {
                type: "box",
                layout: "vertical",
                paddingAll: "lg",
                backgroundColor: "#ffffff",
                contents: [
                  // Circular index badge
                  {
                    type: "box",
                    layout: "vertical",
                    width: "24px",
                    height: "24px",
                    backgroundColor: isUnread ? "#ecfdf5" : "#f1f5f9",
                    cornerRadius: "12px",
                    justifyContent: "center",
                    alignItems: "center",
                    contents: [
                      {
                        type: "text",
                        text: String(index + 1),
                        color: isUnread ? "#10b981" : "#94a3b8",
                        size: "xs",
                        weight: "bold",
                        align: "center",
                        gravity: "center"
                      }
                    ]
                  },
                  // Task Title
                  {
                    type: "text",
                    text: task.title || "ไม่มีหัวข้อ",
                    weight: "bold",
                    size: "sm",
                    color: "#0f172a",
                    margin: "md",
                    wrap: true
                  },
                  // Category Badge or label
                  {
                    type: "text",
                    text: task.category || "General",
                    size: "xxs",
                    color: "#64748b",
                    margin: "xs",
                    weight: "semibold"
                  },
                  // Description
                  {
                    type: "text",
                    text: task.detail || "ไม่มีรายละเอียดเพิ่มเติม",
                    size: "xs",
                    color: "#94a3b8",
                    margin: "md",
                    wrap: true
                  },
                  // Styled action boxes for premium look
                  isUnread ? {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#22c55e",
                    cornerRadius: "6px",
                    paddingTop: "xs",
                    paddingBottom: "xs",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "md",
                    action: {
                      type: "postback",
                      label: "รับงานนี้",
                      data: `action=accept_one&handoverId=${handoverId}&index=${index}`
                    },
                    contents: [
                      {
                        type: "text",
                        text: "รับงานนี้",
                        color: "#ffffff",
                        weight: "bold",
                        size: "xs",
                        align: "center",
                        gravity: "center"
                      }
                    ]
                  } : {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#f1f5f9",
                    cornerRadius: "6px",
                    paddingTop: "xs",
                    paddingBottom: "xs",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "md",
                    contents: [
                      {
                        type: "text",
                        text: "รับแล้ว",
                        color: "#94a3b8",
                        weight: "bold",
                        size: "xs",
                        align: "center",
                        gravity: "center"
                      }
                    ]
                  }
                ]
              }
            };
          });

          // Build individual tasks list carousel message
          const carouselMessage = {
            type: "flex",
            altText: "📋 รายงานรายการย่อยสไลด์แผงงานค้าง",
            contents: {
              type: "carousel",
              contents: bubbles.slice(0, 10) // LINE supports max 10 cards in carousel
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
              messages: [carouselMessage]
            })
          });
          console.log(`Carousel post response: ${res.status}`);
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
