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
    const department = record.division || record.department || "General Lab";
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
    let shortId = `LAB-${cleanIdPart.substring(0, Math.min(6, cleanIdPart.length)).toUpperCase() || "NEW"}`;

    // Attempt to fetch the actual task_number from the database for this handover
    try {
      const { data: dbHandover, error: dbErr } = await supabase
        .from("handovers")
        .select("task_number")
        .eq("id", handoverId)
        .single();
      if (!dbErr && dbHandover && dbHandover.task_number) {
        console.log(`Using database sequential tracking number: ${dbHandover.task_number}`);
        shortId = dbHandover.task_number;
      } else {
        console.warn("Could not retrieve task_number, falling back to UUID shortId:", dbErr);
      }
    } catch (dbFetchErr) {
      console.error("Exception fetching task_number from DB:", dbFetchErr);
    }

    // Build LINE Flex Message based on requested card design with maximum compatibility
    const taskComponents = tasks.map((t: any, idx: number) => {
      return {
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: "24px",
            height: "24px",
            backgroundColor: "#DCFCE7",
            cornerRadius: "12px",
            justifyContent: "center",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: String(idx + 1),
                color: "#16A34A",
                size: "xs",
                weight: "bold",
                align: "center",
                gravity: "center"
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            flex: 1,
            margin: "md",
            contents: [
              {
                type: "text",
                text: t.title || "ไม่มีหัวข้อ",
                weight: "bold",
                size: "lg",
                color: "#1A1A2E",
                wrap: true,
                adjustMode: "shrink-to-fit"
              },
              ...(t.detail ? [
                {
                  type: "text",
                  text: t.detail,
                  size: "xs",
                  color: "#6B7280",
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
      altText: `ส่งต่อเวรใหม่: ${department} (เวร${shift})`,
      contents: {
        type: "bubble",
        size: "giga",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "xl",
          backgroundColor: "#ffffff",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  width: "52px",
                  height: "52px",
                  backgroundColor: "#2B8BE8",
                  cornerRadius: "12px",
                  justifyContent: "center",
                  alignItems: "center",
                  contents: [
                    {
                      type: "image",
                      url: `${supabaseUrl}/storage/v1/object/public/icons/icon-checklist.svg`,
                      size: "28px",
                      aspectMode: "fit"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  flex: 1,
                  contents: [
                    {
                      type: "text",
                      text: "ส่งเวร",
                      size: "xs",
                      color: "#6B7280"
                    },
                    {
                      type: "text",
                      text: shortId,
                      size: "xl",
                      weight: "bold",
                      color: "#1A1A2E",
                      adjustMode: "shrink-to-fit"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  alignItems: "flex-end",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#FEF3C7",
                      cornerRadius: "20px",
                      paddingStart: "md",
                      paddingEnd: "md",
                      paddingTop: "xs",
                      paddingBottom: "xs",
                      contents: [
                        {
                          type: "text",
                          text: "PENDING",
                          size: "xs",
                          weight: "bold",
                          color: "#D97706"
                        }
                      ]
                    },
                    {
                      type: "text",
                      text: `${formattedDate} • ${formattedTime}`,
                      size: "xs",
                      color: "#9CA3AF",
                      margin: "xs",
                      wrap: false
                    }
                  ]
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              backgroundColor: "#F0F6FC",
              cornerRadius: "12px",
              paddingAll: "md",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      width: "40px",
                      height: "40px",
                      backgroundColor: "#ffffff",
                      cornerRadius: "10px",
                      justifyContent: "center",
                      alignItems: "center",
                      contents: [
                        {
                          type: "image",
                          url: `${supabaseUrl}/storage/v1/object/public/icons/icon-building.svg`,
                          size: "24px",
                          aspectMode: "fit"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      margin: "md",
                      justifyContent: "center",
                      contents: [
                        {
                          type: "text",
                          text: department,
                          weight: "bold",
                          size: "md",
                          color: "#1A1A2E"
                        },
                        {
                          type: "text",
                          text: `เวร${shift}`,
                          size: "sm",
                          color: "#2B8BE8",
                          weight: "bold"
                        }
                      ]
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
                  layout: "horizontal",
                  margin: "md",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      width: "20px",
                      height: "20px",
                      backgroundColor: "#ffffff",
                      cornerRadius: "10px",
                      justifyContent: "center",
                      alignItems: "center",
                      contents: [
                        {
                          type: "text",
                          text: "P",
                          size: "xxs",
                          color: "#6B7280",
                          align: "center",
                          gravity: "center"
                        }
                      ]
                    },
                    {
                      type: "text",
                      text: `ผู้ส่งเวร: ${senderName}`,
                      size: "sm",
                      color: "#6B7280",
                      margin: "sm",
                      gravity: "center",
                      flex: 1,
                      wrap: true
                    }
                  ]
                }
              ]
            },
            {
              type: "text",
              text: "รายการงาน",
              size: "xs",
              color: "#6B7280",
              weight: "bold",
              margin: "lg"
            },
            ...taskComponents
          ]
        },
        footer: {
          type: "box",
          layout: "horizontal",
          spacing: "md",
          paddingAll: "lg",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#16A34A",
              height: "md",
              action: {
                type: "postback",
                label: "รับทั้งหมด",
                data: `action=accept_all&handoverId=${handoverId}`
              }
            },
            {
              type: "button",
              style: "link",
              color: "#16A34A",
              height: "md",
              action: {
                type: "postback",
                label: "เลือกรับงาน",
                data: `action=select&handoverId=${handoverId}`
              }
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
