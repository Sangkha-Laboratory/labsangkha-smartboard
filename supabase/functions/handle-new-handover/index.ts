import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const payload = await req.json();
    console.log("Received payload for handle-new-handover:", JSON.stringify(payload));

    // Handle standard Supabase Webhook payload format
    const record = payload.record || payload;
    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Missing handover record or ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const handoverId = record.id;
    const department = record.department || "General Lab";
    const shift = record.shift || "ไม่ระบุ";
    const senderName = record.sender_name || "เจ้าหน้าที่";
    const tasks = Array.isArray(record.tasks) ? record.tasks : [];
    const createdAt = record.created_at || new Date().toISOString();

    // Lazy load Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration environment variables.");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "handover_sys" }
    });

    // 1. Call RPC get_active_line_group to get group_id
    const { data: groupId, error: rpcError } = await supabase.rpc("get_active_line_group");
    if (rpcError) {
      console.error("RPC get_active_line_group failed:", rpcError);
    }
    
    if (!groupId) {
      console.log("No active LINE group found. Message will not be sent to LINE.");
      return new Response(JSON.stringify({ success: true, message: "No active LINE group found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Sending LINE notification to group: ${groupId}`);

    // Format Thai Buddhist Era date
    const d = new Date(createdAt);
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const date = d.getDate();
    const month = monthNames[d.getMonth()];
    const thaiYear = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${date} ${month} ${thaiYear}`;
    const formattedTime = `${hours}:${minutes}`;

    // Generate short ID from UUID to match "LAB-XXXX"
    const shortId = `LAB-${handoverId.substring(0, 4).toUpperCase()}`;

    // Build LINE Flex Message based on requested card design
    const flexMessage = {
      type: "flex",
      altText: `📢 ส่งต่อเวรใหม่: ${department} (เวร${shift})`,
      contents: {
        type: "bubble",
        size: "mega",
        cornerRadius: "xxl",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "xxl",
          backgroundColor: "#ffffff",
          contents: [
            // Top row with Icon, Info and Badge
            {
              type: "box",
              layout: "horizontal",
              alignItems: "center",
              spacing: "md",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#0099ff",
                  cornerRadius: "xl",
                  alignItems: "center",
                  justifyContent: "center",
                  contents: [
                    {
                      type: "icon",
                      url: "https://img.icons8.com/color/96/todo-list.png",
                      size: "lg"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  flex: 1,
                  contents: [
                    {
                      type: "text",
                      text: "ส่งเวร",
                      size: "xs",
                      color: "#94a3b8",
                      weight: "bold"
                    },
                    {
                      type: "text",
                      text: shortId,
                      size: "xl",
                      weight: "bold",
                      color: "#0f172a"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  alignItems: "end",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#fef9c3",
                      cornerRadius: "md",
                      paddingStart: "sm",
                      paddingEnd: "sm",
                      paddingTop: "xs",
                      paddingBottom: "xs",
                      contents: [
                        {
                          type: "text",
                          text: "PENDING",
                          color: "#ca8a04",
                          size: "xxs",
                          weight: "bold"
                        }
                      ]
                    },
                    {
                      type: "text",
                      text: `${formattedDate} • ${formattedTime}`,
                      size: "xxs",
                      color: "#94a3b8",
                      margin: "sm",
                      weight: "bold"
                    }
                  ]
                }
              ]
            },
            // Department Card Box
            {
              type: "box",
              layout: "vertical",
              margin: "xl",
              paddingAll: "lg",
              backgroundColor: "#f8fafc",
              borderWidth: "1px",
              borderColor: "#f1f5f9",
              cornerRadius: "xl",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  alignItems: "center",
                  spacing: "md",
                  contents: [
                    {
                      type: "image",
                      url: "https://img.icons8.com/fluency/96/hospital.png",
                      size: "xxs",
                      flex: 0
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: department,
                          size: "md",
                          weight: "bold",
                          color: "#1e293b"
                        },
                        {
                          type: "text",
                          text: `เวร${shift}`,
                          size: "xs",
                          color: "#0284c7",
                          weight: "bold",
                          margin: "xs"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  alignItems: "center",
                  margin: "md",
                  spacing: "xs",
                  contents: [
                    {
                      type: "image",
                      url: "https://img.icons8.com/fluency/96/user-male-circle.png",
                      size: "xxs",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: `ผู้ส่งเวร: ${senderName}`,
                      size: "xs",
                      color: "#64748b",
                      weight: "semibold"
                    }
                  ]
                }
              ]
            },
            // Title and Tasks summary section
            {
              type: "text",
              text: "รายการงาน",
              size: "xs",
              color: "#94a3b8",
              weight: "bold",
              margin: "xl"
            },
            {
              type: "box",
              layout: "horizontal",
              alignItems: "center",
              margin: "sm",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  width: "24px",
                  height: "24px",
                  backgroundColor: "#f0fdf4",
                  cornerRadius: "xxl",
                  alignItems: "center",
                  justifyContent: "center",
                  contents: [
                    {
                      type: "text",
                      text: String(tasks.length),
                      color: "#16a34a",
                      size: "xs",
                      weight: "bold"
                    }
                  ]
                },
                {
                  type: "text",
                  text: "งาน",
                  size: "sm",
                  weight: "bold",
                  color: "#0f172a"
                }
              ]
            },
            // Two elegant custom action buttons
            {
              type: "box",
              layout: "horizontal",
              margin: "xxl",
              spacing: "md",
              contents: [
                // "รับทั้งหมด" (Solid Green button)
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#22c55e",
                  cornerRadius: "xl",
                  paddingTop: "md",
                  paddingBottom: "md",
                  action: {
                    type: "postback",
                    label: "รับทั้งหมด",
                    data: `action=accept_all&taskId=${handoverId}`
                  },
                  contents: [
                    {
                      type: "text",
                      text: "รับทั้งหมด",
                      color: "#ffffff",
                      align: "center",
                      size: "xs",
                      weight: "bold"
                    }
                  ]
                },
                // "เลือกรับงาน" (White with Green border button)
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#ffffff",
                  borderWidth: "1px",
                  borderColor: "#22c55e",
                  cornerRadius: "xl",
                  paddingTop: "md",
                  paddingBottom: "md",
                  action: {
                    type: "postback",
                    label: "เลือกรับงาน",
                    data: `action=select&taskId=${handoverId}`
                  },
                  contents: [
                    {
                      type: "text",
                      text: "เลือกรับงาน",
                      color: "#22c55e",
                      align: "center",
                      size: "xs",
                      weight: "bold"
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    };

    // 2. Clear credentials for LINE Channel Token
    const lineAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (!lineAccessToken) {
      throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable.");
    }

    // 3. POST to LINE push message API
    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lineAccessToken}`
      },
      body: JSON.stringify({
        to: groupId,
        messages: [flexMessage]
      })
    });

    const lineData = await lineResponse.text();
    console.log("LINE communication response status:", lineResponse.status, lineData);

    if (!lineResponse.ok) {
      throw new Error(`LINE API returned error: ${lineResponse.status} - ${lineData}`);
    }

    return new Response(JSON.stringify({ success: true, lineResult: lineData }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Critical error in handle-new-handover server-less function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
