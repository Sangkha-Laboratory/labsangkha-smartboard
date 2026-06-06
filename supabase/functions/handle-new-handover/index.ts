import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

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

    // Handle support tickets being submitted
    if (payload.action === "support_ticket") {
      console.log("Processing support_ticket notification...");
      const ticketId = payload.ticket_id || `TKT-${Math.floor(100000 + Math.random() * 90000)}`;
      const callerName = payload.caller_name || "ไม่ระบุชื่อ";
      const department = payload.department || "Central Lab";
      const categoryId = payload.category || "bug";
      const userMessage = payload.message || "-";

      let categoryLabel = "พบข้อผิดพลาดของระบบ (Bug)";
      let badgeColor = "#EF4444"; // Red for bug
      let badgeBg = "#FEE2E2";

      if (categoryId === "feature") {
        categoryLabel = "ข้อเสนอแนะ / เพิ่มฟีเจอร์ใหม่";
        badgeColor = "#3B82F6"; // Blue
        badgeBg = "#DBEAFE";
      } else if (categoryId === "account") {
        categoryLabel = "ปัญหาเกี่ยวกับบัญชีและรหัสผ่าน";
        badgeColor = "#8B5CF6"; // Purple
        badgeBg = "#F3E8FF";
      } else if (categoryId === "other") {
        categoryLabel = "ปัญหาทางเทคนิคอื่นๆ";
        badgeColor = "#6B7280"; // Gray
        badgeBg = "#F3F4F6";
      }

      // Lazy load Supabase config
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ success: false, error: "Missing Supabase configuration." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const supabaseClientForTicket = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: "handover_sys" }
      });

      // Fetch active LINE destination: Prioritize LINE_ADMIN_USER_ID (personal) or LINE_ADMIN_GROUP_ID (admin group)
      let targetGroupId = Deno.env.get("LINE_ADMIN_USER_ID") || Deno.env.get("LINE_ADMIN_GROUP_ID");
      let destinationType = "บัญชีส่วนตัว Admin/กลุ่มตั้งค่าเฉพาะ";

      if (!targetGroupId) {
        destinationType = "กลุ่มไลน์ผู้ใช้ทั่วไป (Fallback)";
        try {
          const { data: rpcData } = await supabaseClientForTicket.rpc("get_active_line_group");
          if (rpcData) {
            targetGroupId = rpcData;
          } else {
            const { data: selectData } = await supabaseClientForTicket
              .from("line_groups")
              .select("group_id")
              .eq("is_active", true)
              .order("joined_at", { ascending: false })
              .limit(1);
            if (selectData && selectData.length > 0) {
              targetGroupId = selectData[0].group_id;
            }
          }
        } catch (e) {
          console.error("Error fetching fallback group ID for ticket notification:", e);
        }
      }

      if (!targetGroupId) {
        return new Response(JSON.stringify({ success: false, error: "No destination found (Please configure LINE_ADMIN_USER_ID or set up an active LINE group)." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Sending support ticket to destination: ${targetGroupId} (${destinationType})`);

      // Theme Configuration based on Category
      let categoryHeader = "ปัญหาทั่วไป";

      if (categoryId === "bug") {
        categoryHeader = "พบข้อผิดพลาด (Bug)";
      } else if (categoryId === "feature") {
        categoryHeader = "แนะนำฟีเจอร์ใหม่";
      } else if (categoryId === "account") {
        categoryHeader = "บัญชีและรหัสผ่าน";
      }

      // Create a clean, simple text message for LINE
      const textMessage = {
        type: "text",
        text: `📥 ตั๋วแจ้งปัญหาระบบ\nรหัส: ${ticketId}\nประเภท: ${categoryHeader}\nผู้ส่ง: ${callerName}\nห้องแล็บ: ${department}\n\nข้อความ: "${maskSensitiveData(userMessage)}"\n\n🕒 ${new Date().toLocaleString('th-TH')}\n🔧 ผู้ดูแลระบบกรุณาตรวจสอบใน Admin Portal`
      };

      const lineAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
      if (!lineAccessToken) {
        return new Response(JSON.stringify({ success: false, error: "Missing LINE access token for ticket notification." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lineAccessToken}`
        },
        body: JSON.stringify({
          to: targetGroupId,
          messages: [textMessage]
        })
      });

      const lineData = await lineResponse.text();
      console.log("LINE ticket push outcome:", lineResponse.status, lineData);

      return new Response(JSON.stringify({ success: true, lineResult: lineData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle interactive LIFF task updates
    if (payload.action === "task_accepted") {
      console.log("Processing task_accepted update notification...");
      const handoverId = payload.handover_id;
      const acceptedBy = payload.accepted_by || "เจ้าหน้าที่";
      const channelLabel = payload.channel === "WEB" ? "ผ่านเว็บไซต์" : "ผ่าน LINE";
      const channelColor = payload.channel === "WEB" ? "#1D4ED8" : "#4B5563";
      const channelBg = payload.channel === "WEB" ? "#EFF6FF" : "#F3F4F6";
      const acceptedTaskIds = payload.accepted_task_ids || [];

      // Lazy load Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ success: false, error: "Missing Supabase configuration." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const supabaseClientForLIFF = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: "handover_sys" }
      });

      // Fetch active LINE group ID
      let targetGroupId = null;
      try {
        const { data: rpcData } = await supabaseClientForLIFF.rpc("get_active_line_group");
        if (rpcData) {
          targetGroupId = rpcData;
        } else {
          const { data: selectData } = await supabaseClientForLIFF
            .from("line_groups")
            .select("group_id")
            .eq("is_active", true)
            .order("joined_at", { ascending: false })
            .limit(1);
          if (selectData && selectData.length > 0) {
            targetGroupId = selectData[0].group_id;
          }
        }
      } catch (e) {
        console.error("Error fetching group ID for LIFF notification:", e);
      }

      if (!targetGroupId) {
        return new Response(JSON.stringify({ success: false, error: "No active LINE group for update." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch target handover
      const { data: targetTask, error: targetErr } = await supabaseClientForLIFF
        .from('handovers')
        .select('*')
        .eq('id', handoverId)
        .single();
      
      if (targetErr || !targetTask) {
        return new Response(JSON.stringify({ success: false, error: "Target task not found." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch batch of tasks in same created_at window
      const targetTime = new Date(targetTask.created_at).getTime();
      const lowerBound = new Date(targetTime - 5000).toISOString();
      const upperBound = new Date(targetTime + 5000).toISOString();

      const { data: batchData, error: batchErr } = await supabaseClientForLIFF
        .from('handovers')
        .select('*')
        .eq('sender_id', targetTask.sender_id)
        .eq('division', targetTask.division)
        .gte('created_at', lowerBound)
        .lte('created_at', upperBound)
        .order('created_at', { ascending: true });

      if (batchErr || !batchData) {
        return new Response(JSON.stringify({ success: false, error: "Batch tasks not found." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch users map to display real names
      const { data: usersData } = await supabaseClientForLIFF.from('users').select('id, full_name');
      const usersMap: Record<string, string> = {};
      if (usersData) {
        usersData.forEach((u: any) => { usersMap[u.id] = u.full_name; });
      }

      const totalCount = batchData.length;
      const pendingCount = batchData.filter(t => t.status === 'Pending').length;
      const shortId = targetTask.task_number || `LAB-${handoverId.substring(0, 4).toUpperCase()}`;

      // Build listing of newly accepted tasks
      const newlyAcceptedTasks = batchData.filter(t => acceptedTaskIds.includes(t.id));

      let flexMessage: any = null;

      if (pendingCount > 0) {
        // Still has pending tasks
        const liffId = Deno.env.get("LINE_LIFF_ID") || "2010256621-suCeCNrD";
        const liffUrl = `https://liff.line.me/${liffId}?handover_id=${handoverId}`;

        flexMessage = {
          type: "flex",
          altText: `อัปเดต: ${acceptedBy} รับงานแล้ว (${shortId})`,
          contents: {
            type: "bubble",
            size: "mega",
            header: {
              type: "box",
              layout: "horizontal",
              backgroundColor: "#DCFCE7",
              paddingAll: "md",
              contents: [
                {
                  type: "text",
                  text: `${shortId} อัปเดต`,
                  weight: "bold",
                  size: "sm",
                  color: "#16A34A"
                },
                {
                  type: "text",
                  text: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.",
                  size: "xs",
                  color: "#6B7280",
                  align: "end"
                }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              paddingAll: "lg",
              contents: [
                {
                  type: "text",
                  text: `${acceptedBy} รับงานแล้ว`,
                  weight: "bold",
                  size: "md",
                  color: "#18181B"
                },
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: channelBg,
                      cornerRadius: "4px",
                      paddingStart: "xs",
                      paddingEnd: "xs",
                      contents: [
                        {
                          type: "text",
                          text: channelLabel,
                          size: "xxs",
                          color: channelColor,
                          weight: "bold"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  spacing: "xs",
                  contents: newlyAcceptedTasks.map((t) => ({
                    type: "text",
                    text: `✓ ${maskSensitiveData(t.title)}`,
                    size: "xs",
                    color: "#4B5563",
                    wrap: true
                  }))
                },
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "lg",
                  backgroundColor: "#FEF3C7",
                  paddingAll: "sm",
                  cornerRadius: "6px",
                  contents: [
                    {
                      type: "text",
                      text: `⏳ ยังรอรับอีก ${pendingCount} งาน`,
                      size: "xs",
                      weight: "bold",
                      color: "#D97706"
                    }
                  ]
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
                    label: "เลือกรับงานที่เหลือ",
                    uri: liffUrl
                  }
                }
              ]
            }
          }
        };
      } else {
        // ALL Tasks Accepted!
        const assignments = batchData.map(t => {
          const recName = usersMap[t.receiver_id] || t.receiver_line_name || t.receiver_id || "ไม่ระบุชื่อ";
          
          let channel = "LINE";
          if (acceptedTaskIds.includes(t.id)) {
            channel = payload.channel === "WEB" ? "เว็บ" : "LINE";
          } else if (!t.receiver_line_name && t.receiver_id) {
            channel = "เว็บ";
          } else {
            channel = "LINE";
          }

          return {
            name: recName,
            title: t.title,
            channel
          };
        });

        flexMessage = {
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
                        backgroundColor: a.channel === "เว็บ" ? "#EFF6FF" : "#F3F4F6",
                        cornerRadius: "4px",
                        paddingStart: "xs",
                        paddingEnd: "xs",
                        justifyContent: "center",
                        contents: [
                          {
                            type: "text",
                            text: a.channel,
                            size: "xxs",
                            color: a.channel === "เว็บ" ? "#1D4ED8" : "#6B7280",
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
      }

      // Send push message to LINE Group
      const lineAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
      if (!lineAccessToken) {
        return new Response(JSON.stringify({ success: false, error: "Missing LINE access token for update notification." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lineAccessToken}`
        },
        body: JSON.stringify({
          to: targetGroupId,
          messages: [flexMessage]
        })
      });

      const lineData = await lineResponse.text();
      console.log("LINE update push outcome:", lineResponse.status, lineData);

      return new Response(JSON.stringify({ success: true, lineResult: lineData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
      const maskedTitle = maskSensitiveData(t.title || "ไม่มีหัวข้อ");
      const maskedDetail = t.detail ? maskSensitiveData(t.detail) : "";

      return {
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: "20px",
            height: "20px",
            backgroundColor: "#DCFCE7",
            cornerRadius: "10px",
            justifyContent: "center",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: String(idx + 1),
                color: "#16A34A",
                size: "xxs",
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
                text: maskedTitle,
                weight: "bold",
                size: "sm",
                color: "#1A1A2E",
                wrap: true,
                adjustMode: "shrink-to-fit"
              },
              ...(maskedDetail ? [
                {
                  type: "text",
                  text: maskedDetail,
                  size: "xxs",
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
        size: "mega",
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
                      url: "https://img.icons8.com/ios-filled/100/ffffff/checklist.png",
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
                      size: "lg",
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
                          size: "xxs",
                          weight: "bold",
                          color: "#D97706"
                        }
                      ]
                    },
                    {
                      type: "text",
                      text: `${formattedDate} • ${formattedTime}`,
                      size: "xxs",
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
                          url: "https://img.icons8.com/ios-filled/100/2b8be8/company.png",
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
                          size: "sm",
                          color: "#1A1A2E"
                        },
                        {
                          type: "text",
                          text: `เวร${shift}`,
                          size: "xs",
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
                      size: "xs",
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
              size: "xxs",
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
              color: "#2B8BE8",
              height: "md",
              action: {
                type: "uri",
                label: "เลือกรับงาน",
                uri: `https://liff.line.me/${Deno.env.get("LINE_LIFF_ID") || "2010256621-suCeCNrD"}?handover_id=${handoverId}`
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
