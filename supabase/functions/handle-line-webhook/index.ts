import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function maskSensitiveData(text: string): string {
  if (!text) return "";
  let masked = text;

  // 1. Match typical HN patterns, e.g. HN followed by numbers or symbols and alphanumeric code.
  masked = masked.replace(/(HN|H\.N\.)\s*[:\-\s]*\s*([a-zA-Z0-9\-\/]+)/gi, (match, prefix, val) => {
    return "HN: ****";
  });

  // 2. Match typical LN patterns, e.g. LN: 12345, LN 4567-89, etc.
  masked = masked.replace(/(LN|L\.N\.)\s*[:\-\s]*\s*([a-zA-Z0-9\-\/]+)/gi, (match, prefix, val) => {
    return "LN: ****";
  });

  // 3. Match Patient Name starting with prefix (นาย, นาง, นางสาว, น.ส., นส., ด.ช., ด.ญ., ดช., ดญ., เด็กชาย, เด็กหญิง) and Thai alphabet
  masked = masked.replace(/(นาย|นาง|นางสาว|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|เด็กชาย|เด็กหญิง)\s*([ก-๙]+)(?:\s+([ก-๙]+))?/g, (match, prefix, firstName, lastName) => {
    if (lastName) {
      return `${prefix} **** ****`;
    }
    return `${prefix} ****`;
  });

  // 4. Match "คนไข้ชื่อ", "ชื่อคนไข้", "ชื่อผู้ป่วย" followed by Thai alphabet (optional prefix, first name, last name)
  masked = masked.replace(/(คนไข้ชื่อ|ชื่อคนไข้|ชื่อผู้ป่วย|ชื่อ)\s*(นาย|นาง|นางสาว|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|ดช\.|ดญ\.|เด็กชาย|เด็กหญิง)?\s*([ก-๙]+)(?:\s+([ก-๙]+))?/g, (match, label, prefix, firstName, lastName) => {
    const pref = prefix || "";
    if (lastName) {
      return `${label} ${pref} **** ****`.replace(/\s+/g, " ");
    }
    return `${label} ${pref} ****`.replace(/\s+/g, " ");
  });

  return masked;
}

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

// Utility to reply to message or postback using replyToken
async function replyLineMessage(replyToken: string, messages: any[], accessToken: string): Promise<boolean> {
  if (!replyToken) return false;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages: messages
      })
    });
    console.log(`Reply response: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("Failed to send replyLineMessage:", err);
    return false;
  }
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
          const welcomeMsg = "สวัสดีครับ! 🏥🤖 ระบบรับ-ส่งมอบเวร กลุ่มงานเทคนิคการแพทย์ ยินดีให้บริการบันทึกพิกัดและประสานงานร่วมกับกลุ่มนี้อย่างถูกต้องเรียบร้อยแล้ว";
          let replied = false;
          if (event.replyToken) {
            replied = await replyLineMessage(
              event.replyToken,
              [{ type: "text", text: welcomeMsg }],
              lineAccessToken
            );
          }
          if (!replied && groupId) {
            await pushLineMessage(groupId, welcomeMsg, lineAccessToken);
          }
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
          const handoverId = params.get("handoverId") || params.get("handover_id") || params.get("taskId");
          if (!handoverId) {
            console.warn("Missing handoverId or taskId in accept_all request");
            continue;
          }

          console.log(`Action accept_all triggered for handover ID: ${handoverId}`);
          
          try {
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
              const errorMsg = `🏥 เกิดข้อผิดพลาด: ไม่พบรายละเอียดหลักของใบส่งเวรในระบบ (ID: ${handoverId})\nรายละเอียด: ${refError?.message || "ไม่พบแถวข้อมูล"}`;
              let replied = false;
              if (event.replyToken) {
                replied = await replyLineMessage(event.replyToken, [{ type: "text", text: errorMsg }], lineAccessToken);
              }
              if (!replied) {
                await pushLineMessage(groupId || userId, errorMsg, lineAccessToken);
              }
              continue;
            }

            // A. Check if already accepted to prevent duplicate button clicks/overwrites
            if (refTask.status !== "Pending") {
              const alreadyReceiver = refTask.receiver_line_name || "เจ้าหน้าที่";
              const alreadyShortId = refTask.task_number || `LAB-${handoverId.substring(0, 4).toUpperCase()}`;

              const alreadyAcceptedFlex = {
                type: "flex",
                altText: `⚠️ ${alreadyShortId} มีผู้รับงานแล้ว`,
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
                        type: "box",
                        layout: "horizontal",
                        contents: [
                          {
                            type: "box",
                            layout: "vertical",
                            width: "16px",
                            height: "16px",
                            backgroundColor: "#FEE2E2",
                            cornerRadius: "8px",
                            justifyContent: "center",
                            alignItems: "center",
                            contents: [
                              {
                                type: "text",
                                text: "!",
                                color: "#EF4444",
                                size: "xxs",
                                weight: "bold",
                                align: "center"
                              }
                            ]
                          },
                          {
                            type: "text",
                            text: `${alreadyShortId} ถูกรับงานไปแล้ว`,
                            weight: "bold",
                            size: "sm",
                            color: "#EF4444",
                            margin: "sm"
                          }
                        ]
                      },
                      {
                        type: "separator",
                        margin: "md",
                        color: "#E5E7EB"
                      },
                      {
                        type: "text",
                        text: `รายการแจ้งยอดงานกลุ่มนี้ได้รับการตอบรับครบถ้วนแล้ว โดยคุณ ${alreadyReceiver} เพื่อป้องกันความซ้ำซ้อนในระบบ`,
                        size: "xs",
                        color: "#4B5563",
                        margin: "md",
                        wrap: true
                      },
                      {
                        type: "text",
                        text: `ระบบล็อกปุ่มตอบรับป้องกันความสับสนในการส่งมอบเวรของทีม`,
                        size: "xxs",
                        color: "#9CA3AF",
                        margin: "sm",
                        wrap: true
                      }
                    ]
                  }
                }
              };

              let replied = false;
              if (event.replyToken) {
                replied = await replyLineMessage(event.replyToken, [alreadyAcceptedFlex], lineAccessToken);
              }
              if (!replied) {
                const pushTarget = groupId || userId;
                if (pushTarget) {
                  await fetch("https://api.line.me/v2/bot/message/push", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${lineAccessToken}`
                    },
                    body: JSON.stringify({
                      to: pushTarget,
                      messages: [alreadyAcceptedFlex]
                    })
                  });
                }
              }
              continue;
            }

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

            // Identify all tasks in same batch (+/- 5 seconds)
            let targetTime = new Date().getTime();
            if (refTask.created_at) {
              const parsedTime = new Date(refTask.created_at).getTime();
              if (!isNaN(parsedTime)) {
                targetTime = parsedTime;
              }
            }
            const lowerBound = new Date(targetTime - 5000).toISOString();
            const upperBound = new Date(targetTime + 5000).toISOString();

            // Direct update of the single reference task ID first to guarantee success for the clicked item
            try {
              await supabase
                .from('handovers')
                .update({
                  status: 'Accepted',
                  receiver_id: registeredUserId,
                  receiver_line_name: displayName,
                  accepted_at: new Date().toISOString()
                })
                .eq('id', handoverId)
                .eq('status', 'Pending');
            } catch (err: any) {
              console.warn("Direct update of reference task fell back:", err);
            }

            // 3. Update all pending items in this batch to Accepted
            try {
              let updateQuery = supabase
                .from('handovers')
                .update({
                  status: 'Accepted',
                  receiver_id: registeredUserId,
                  receiver_line_name: displayName,
                  accepted_at: new Date().toISOString()
                })
                .eq('sender_id', refTask.sender_id)
                .gte('created_at', lowerBound)
                .lte('created_at', upperBound)
                .eq('status', 'Pending');

              if (refTask.division) {
                updateQuery = updateQuery.eq('division', refTask.division);
              }

              await updateQuery;
            } catch (err) {
              console.error("Exception during batch update in accept_all:", err);
            }

            // Also execute legacy RPC just in case they have legacy column/schema
            try {
              await supabase.rpc("accept_handover_from_line", {
                p_handover_id: handoverId,
                p_line_display_name: displayName,
                p_line_user_id: userId
              });
            } catch (e: any) {
              console.warn("Legacy RPC error:", e);
            }

            // Fetch users map to display real names
            const usersMap: Record<string, string> = {};
            try {
              const { data: usersData } = await supabase.from('users').select('id, full_name');
              if (usersData) {
                usersData.forEach((u: any) => { usersMap[u.id] = u.full_name; });
              }
            } catch (err) {
              console.warn("Failed to fetch users map in webhook:", err);
            }

            // Fetch the final batch tasks to build the Flex Message
            let batchTasks: any[] = [];
            try {
              let query = supabase
                .from('handovers')
                .select('*')
                .eq('sender_id', refTask.sender_id)
                .gte('created_at', lowerBound)
                .lte('created_at', upperBound);

              if (refTask.division) {
                query = query.eq('division', refTask.division);
              }

              const { data: fetchedBatch } = await query.order('created_at', { ascending: true });
              if (fetchedBatch && fetchedBatch.length > 0) {
                batchTasks = fetchedBatch;
              }
            } catch (err) {
              console.warn("Failed to fetch final batch tasks for Flex Message:", err);
            }

            if (batchTasks.length === 0) {
              batchTasks = [refTask];
            }

            const shortId = refTask.task_number || `LAB-${handoverId.substring(0, 4).toUpperCase()}`;
            const assignments = batchTasks.map((t) => {
              // Determine display name
              let recName = "ไม่ระบุชื่อ";
              let channel = "LINE";

              if (t.id === handoverId) {
                recName = displayName;
                channel = "LINE";
              } else if (t.receiver_line_name) {
                recName = t.receiver_line_name;
                channel = "LINE";
              } else if (t.receiver_id && usersMap[t.receiver_id]) {
                recName = usersMap[t.receiver_id];
                channel = "เว็บ";
              } else if (t.receiver_id) {
                recName = t.receiver_id;
                channel = "เว็บ";
              }

              return {
                name: recName,
                title: t.title || "ไม่มีหัวข้อ",
                channel: channel
              };
            });

            // Build beautifully designed Success Flex Message, same as LIFF
            const flexSuccessCard = {
              type: "flex",
              altText: `✓ ${shortId} รับงานครบกำหนดแล้ว`,
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
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "box",
                          layout: "vertical",
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#DCFCE7",
                          cornerRadius: "8px",
                          justifyContent: "center",
                          alignItems: "center",
                          contents: [
                            {
                              type: "text",
                              text: "✓",
                              color: "#16A34A",
                              size: "xxs",
                              weight: "bold",
                              align: "center"
                            }
                          ]
                        },
                        {
                          type: "text",
                          text: `${shortId} รับงานครบแล้ว`,
                          weight: "bold",
                          size: "sm",
                          color: "#16A34A",
                          margin: "sm"
                        }
                      ]
                    },
                    {
                      type: "separator",
                      margin: "md",
                      color: "#E5E7EB"
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      margin: "md",
                      spacing: "sm",
                      contents: assignments.map((a) => ({
                        type: "box",
                        layout: "horizontal",
                        contents: [
                          {
                            type: "text",
                            text: a.name,
                            weight: "bold",
                            size: "xs",
                            color: "#1A1A2E",
                            flex: 2,
                            wrap: true
                          },
                          {
                            type: "text",
                            text: maskSensitiveData(a.title),
                            size: "xs",
                            color: "#6B7280",
                            flex: 3,
                            wrap: true
                          },
                          {
                            type: "box",
                            layout: "vertical",
                            backgroundColor: "#F3F4F6",
                            cornerRadius: "4px",
                            paddingStart: "xs",
                            paddingEnd: "xs",
                            justifyContent: "center",
                            contents: [
                              {
                                type: "text",
                                text: a.channel,
                                size: "xxs",
                                color: "#6B7280",
                                weight: "bold",
                                align: "center"
                              }
                            ],
                            width: "36px"
                          }
                        ]
                      }))
                    },
                    {
                      type: "text",
                      text: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.",
                      size: "xxs",
                      color: "#9CA3AF",
                      margin: "md"
                    }
                  ]
                }
              }
            };

            // Post Success Card to group
            let replied = false;
            if (event.replyToken) {
              replied = await replyLineMessage(event.replyToken, [flexSuccessCard], lineAccessToken);
            }
            if (!replied) {
              const pushTarget = groupId || userId;
              if (pushTarget) {
                await fetch("https://api.line.me/v2/bot/message/push", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${lineAccessToken}`
                  },
                  body: JSON.stringify({
                    to: pushTarget,
                    messages: [flexSuccessCard]
                  })
                });
              }
            }
          } catch (err: any) {
            console.error("Uncaught exception in accept_all handler:", err);
            const errMsg = `🏥 เกิดข้อผิดพลาดทางเทคนิคขณะบันทึกรับงานทั้งหมด: ${err.message || err}`;
            let replied = false;
            if (event.replyToken) {
              replied = await replyLineMessage(event.replyToken, [{ type: "text", text: errMsg }], lineAccessToken);
            }
            if (!replied) {
              await pushLineMessage(groupId || userId, errMsg, lineAccessToken);
            }
          }
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

          // Post Flex Message response using reply token if available
          let replied = false;
          if (event.replyToken) {
            replied = await replyLineMessage(event.replyToken, [helpFlexMessage], lineAccessToken);
          }
          if (!replied) {
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

          // Build individual task accepted Flex Card response instead of raw text!
          const flexOneSuccessCard = {
            type: "flex",
            altText: `✓ รับงานแล้ว: ${displayName}`,
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
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "box",
                        layout: "vertical",
                        width: "16px",
                        height: "16px",
                        backgroundColor: "#DCFCE7",
                        cornerRadius: "8px",
                        justifyContent: "center",
                        alignItems: "center",
                        contents: [
                          {
                            type: "text",
                            text: "✓",
                            color: "#16A34A",
                            size: "xxs",
                            weight: "bold",
                            align: "center"
                          }
                        ]
                      },
                      {
                        type: "text",
                        text: remaining > 0 ? "รับงานแบ่งส่วนสำเร็จ" : "รับเวรมอบหมายครบเรียบร้อย",
                        weight: "bold",
                        size: "sm",
                        color: "#16A34A",
                        margin: "sm"
                      }
                    ]
                  },
                  {
                    type: "separator",
                    margin: "md",
                    color: "#E5E7EB"
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "md",
                    spacing: "xs",
                    contents: [
                      {
                        type: "text",
                        text: `ผู้ตอบรับ: ${displayName}`,
                        weight: "bold",
                        size: "xs",
                        color: "#1A1A2E"
                      },
                      {
                        type: "text",
                        text: `งานย่อย: ${maskSensitiveData(task_title)}`,
                        size: "xs",
                        color: "#4B5563",
                        wrap: true
                      },
                      {
                        type: "text",
                        text: remaining > 0 ? `⏳ เหลือเวรรอยืนยันอีก ${remaining} รายการ` : "✅ รับงานทุกรายการครบหมดถ้วนร้อยเปอร์เซ็นต์",
                        size: "xs",
                        weight: "bold",
                        color: remaining > 0 ? "#D97706" : "#16A34A",
                        margin: "sm"
                      }
                    ]
                  },
                  {
                    type: "text",
                    text: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.",
                    size: "xxs",
                    color: "#9CA3AF"
                  }
                ]
              }
            }
          };

          let replied = false;
          if (event.replyToken) {
            replied = await replyLineMessage(event.replyToken, [flexOneSuccessCard], lineAccessToken);
          }
          if (!replied) {
            const pushTarget = groupId || userId;
            if (pushTarget) {
              await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${lineAccessToken}`
                },
                body: JSON.stringify({
                  to: pushTarget,
                  messages: [flexOneSuccessCard]
                })
              });
            }
          }
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
