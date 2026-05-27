import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: any = null;
    try {
      payload = await req.json();
    } catch (jsonErr) {
      console.warn("Failed to parse request JSON:", jsonErr);
    }

    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Empty or invalid JSON payload received." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received payload for handle-new-handover:", JSON.stringify(payload));

    const record = payload.record || payload;
    if (!record || !record.id) {
      return new Response(JSON.stringify({ success: false, error: "Missing handover record or ID in payload." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const handoverId = record.id;
    const department = record.department || "General Lab";
    const shift = record.shift || "ไม่ระบุ";
    const senderName = record.sender_name || "เจ้าหน้าที่";
    const tasks = Array.isArray(record.tasks) ? record.tasks : [];
    const createdAt = record.created_at || new Date().toISOString();

    // Lazy load Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing Supabase configuration environment variables inside Edge Function. Please link/configure Supabase correctly."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "handover_sys" }
    });

    // 1. Call RPC get_active_line_group to get group_id, with robust direct SELECT fallback
    let groupId = null;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_active_line_group");
      if (!rpcError && rpcData) {
        groupId = rpcData;
      } else {
        console.warn("RPC get_active_line_group failed or returned no data, attempting direct SELECT:", rpcError);
        
        const { data: selectData, error: selectError } = await supabase
          .from("line_groups")
          .select("group_id")
          .eq("is_active", true)
          .order("joined_at", { ascending: false })
          .limit(1);
          
        if (!selectError && selectData && selectData.length > 0) {
          groupId = selectData[0].group_id;
          console.log("Found active LINE group via SELECT fallback:", groupId);
        } else {
          console.error("Direct SELECT on line_groups failed as well:", selectError);
        }
      }
    } catch (dbErr: any) {
      console.error("Database query failed during group retrieval:", dbErr);
    }
    
    if (!groupId) {
      console.log("No active LINE group found. Message will not be sent to LINE.");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "กรุณาตั้งค่ากลุ่มไลน์รับแจ้งเตือนที่เมนู 'ตั้งค่าโปรแกรม' ก่อนทำการส่งเวร" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending LINE notification to group: ${groupId}`);

    // Format Thai Buddhist Era date safely
    let d = new Date(createdAt);
    if (isNaN(d.getTime())) {
      d = new Date();
    }
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

    // Generate short ID from UUID or ID safely to match "LAB-XXXX"
    const idStr = String(handoverId || "");
    const cleanIdPart = idStr.includes("-") ? idStr.split("-")[0] : idStr;
    const shortId = `LAB-${cleanIdPart.substring(0, Math.min(6, cleanIdPart.length)).toUpperCase() || "NEW"}`;

    // Build LINE Flex Message based on requested card design with maximum compatibility
    const taskComponents = tasks.map((t: any, idx: number) => {
      return {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        margin: "md",
        alignItems: "center",
        contents: [
          // Circular index badge with soft green styling
          {
            type: "box",
            layout: "vertical",
            width: "24px",
            height: "24px",
            backgroundColor: "#ecfdf5",
            cornerRadius: "12px",
            flex: 0,
            justifyContent: "center",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: String(idx + 1),
                color: "#10b981",
                size: "xs",
                weight: "bold",
                align: "center",
                gravity: "center"
              }
            ]
          },
          // Task content
          {
            type: "box",
            layout: "vertical",
            flex: 1,
            spacing: "none",
            contents: [
              {
                type: "text",
                text: t.title || "ไม่มีหัวข้อ",
                size: "sm",
                weight: "bold",
                color: "#0f172a",
                wrap: true
              },
              ...(t.detail ? [
                {
                  type: "text",
                  text: t.detail,
                  size: "xs",
                  color: "#64748b",
                  margin: "xs",
                  wrap: true
                }
              ] : [])
            ]
          }
        ]
      };
    });

    const flexMessage = {
      type: "flex",
      altText: `📢 ส่งต่อเวรใหม่: ${department} (เวร${shift})`,
      contents: {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          backgroundColor: "#ffffff",
          spacing: "md",
          contents: [
            // Top row with Icon, Info and Badge
            {
              type: "box",
              layout: "horizontal",
              alignItems: "center",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  spacing: "md",
                  flex: 1,
                  alignItems: "center",
                  contents: [
                    // Sleek professional sky blue list icon box matching mockup exactly
                    {
                      type: "box",
                      layout: "vertical",
                      width: "40px",
                      height: "40px",
                      backgroundColor: "#00a2ff",
                      cornerRadius: "10px",
                      flex: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      contents: [
                        {
                          type: "text",
                          text: "☰",
                          color: "#ffffff",
                          weight: "bold",
                          size: "md",
                          align: "center",
                          gravity: "center"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "vertical",
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
                          size: "lg",
                          weight: "bold",
                          color: "#0f172a"
                        }
                      ]
                    }
                  ]
                },
                // PENDING badge and date display matching mockup perfectly
                {
                  type: "box",
                  layout: "vertical",
                  flex: 0,
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        {
                          type: "filler"
                        },
                        {
                          type: "box",
                          layout: "vertical",
                          backgroundColor: "#fef3c7",
                          cornerRadius: "6px",
                          paddingStart: "sm",
                          paddingEnd: "sm",
                          paddingTop: "xs",
                          paddingBottom: "xs",
                          contents: [
                            {
                              type: "text",
                              text: "PENDING",
                              color: "#d97706",
                              size: "xxs",
                              weight: "bold"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      type: "text",
                      text: `${formattedDate} • ${formattedTime}`,
                      size: "xxs",
                      color: "#94a3b8",
                      margin: "xs",
                      align: "end"
                    }
                  ]
                }
              ]
            },
            // Department Card Box - match preview card outline style perfectly
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              paddingAll: "md",
              backgroundColor: "#ffffff",
              borderWidth: "1px",
              borderColor: "#e0f2fe",
              cornerRadius: "16px",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  spacing: "md",
                  alignItems: "center",
                  contents: [
                    // light blue icon box
                    {
                      type: "box",
                      layout: "vertical",
                      width: "36px",
                      height: "36px",
                      backgroundColor: "#e0f2fe",
                      cornerRadius: "8px",
                      flex: 0,
                      justifyContent: "center",
                      alignItems: "center",
                      contents: [
                        {
                          type: "text",
                          text: "🏢",
                          size: "sm",
                          align: "center",
                          gravity: "center"
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
                          text: department,
                          size: "sm",
                          weight: "bold",
                          color: "#1e293b"
                        },
                        {
                          type: "text",
                          text: `เวร${shift}`,
                          size: "xs",
                          color: "#00a2ff",
                          weight: "bold"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "separator",
                  margin: "md",
                  color: "#f1f5f9"
                },
                // Sender Row with Outline icon
                {
                  type: "box",
                  layout: "horizontal",
                  spacing: "sm",
                  margin: "md",
                  alignItems: "center",
                  contents: [
                    {
                      type: "text",
                      text: "👤",
                      color: "#94a3b8",
                      size: "xs",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: `ผู้ส่งเวร: ${senderName}`,
                      size: "xs",
                      color: "#64748b"
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
              margin: "lg"
            },
            ...taskComponents,
            // Clean, custom, click-responsive buttons that look beautiful and premium
            {
              type: "box",
              layout: "horizontal",
              margin: "lg",
              spacing: "md",
              contents: [
                // Solid Green Button: "รับทั้งหมด"
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#22c55e",
                  cornerRadius: "12px",
                  paddingTop: "sm",
                  paddingBottom: "sm",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
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
                      weight: "bold",
                      size: "sm",
                      align: "center",
                      gravity: "center"
                    }
                  ]
                },
                // Outline Green Button: "เลือกรับงาน"
                {
                  type: "box",
                  layout: "vertical",
                  borderWidth: "1px",
                  borderColor: "#22c55e",
                  cornerRadius: "12px",
                  paddingTop: "sm",
                  paddingBottom: "sm",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
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
                      weight: "bold",
                      size: "sm",
                      align: "center",
                      gravity: "center"
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    };

    // 2. LINE Channel Token verification (Graceful rather than crash)
    const lineAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (!lineAccessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ในระบบ! กรุณาตั้งค่า Channel Access Token ใน Supabase Edge Functions Secrets" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      let extError = lineData;
      try {
        const pLine = JSON.parse(lineData);
        extError = pLine.message || lineData;
      } catch (_) {}
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `LINE API แนะนำข้อผิดพลาด: ${lineResponse.status} - ${extError}`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, lineResult: lineData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Critical error in handle-new-handover server-less function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || String(error),
      env_status: {
        SUPABASE_URL_EXISTS: !!Deno.env.get("SUPABASE_URL"),
        SUPABASE_SERVICE_ROLE_KEY_EXISTS: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        LINE_CHANNEL_ACCESS_TOKEN_EXISTS: !!Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
