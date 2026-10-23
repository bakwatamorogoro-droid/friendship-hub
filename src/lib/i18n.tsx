import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "sw" | "en";

/** Kamusi ya lugha mbili: Kiswahili (sw) na Kiingereza (en). */
const dict: Record<string, { sw: string; en: string }> = {
  // ===== Urambazaji / Navigation =====
  "nav.home": { sw: "Nyumbani", en: "Home" },
  "nav.about": { sw: "Kuhusu MUMSO", en: "About MUMSO" },
  "nav.services": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "nav.loans": { sw: "Mikopo", en: "Loans" },
  "nav.deaths": { sw: "Misiba", en: "Obituaries" },
  "nav.news": { sw: "Matangazo", en: "Announcements" },
  "nav.grad": { sw: "Mahafali", en: "Graduation" },
  "nav.login": { sw: "Ingia", en: "Sign in" },
  "nav.leaders": { sw: "Uongozi", en: "Leadership" },
  "nav.dashboard": { sw: "Dashibodi", en: "Dashboard" },
  "nav.track": { sw: "Fuatilia Huduma", en: "Track Request" },
  "nav.register": { sw: "Jisajili", en: "Register" },
  "nav.leader_signup": { sw: "Jisajili Kiongozi", en: "Leader Registration" },
  "nav.language": { sw: "Badili lugha", en: "Switch language" },

  // ===== Maneno ya jumla / Common =====
  "common.loading": { sw: "Inapakia...", en: "Loading..." },
  "common.loading_page": { sw: "Inapakia ukurasa...", en: "Loading page..." },
  "common.back": { sw: "Rudi", en: "Back" },
  "common.back_services": { sw: "Rudi kwa Huduma", en: "Back to Services" },
  "common.search": { sw: "Tafuta", en: "Search" },
  "common.cancel": { sw: "Acha", en: "Cancel" },
  "common.edit": { sw: "Hariri", en: "Edit" },
  "common.delete": { sw: "Futa", en: "Delete" },
  "common.send": { sw: "Tuma", en: "Send" },
  "common.sending": { sw: "Inatuma...", en: "Sending..." },
  "common.view_all": { sw: "Ona zote", en: "View all" },
  "common.read_more": { sw: "Soma zaidi", en: "Read more" },
  "common.copy_link": { sw: "Nakili Kiungo", en: "Copy Link" },
  "common.copied": { sw: "Imenakiliwa!", en: "Copied!" },
  "common.close": { sw: "Funga", en: "Close" },
  "common.error": { sw: "Hitilafu", en: "Error" },
  "common.success": { sw: "Imefanikiwa", en: "Success" },
  "common.go_home": { sw: "Rudi Nyumbani", en: "Go home" },
  "common.date": { sw: "Tarehe", en: "Date" },
  "common.status": { sw: "Hali", en: "Status" },
  "common.name": { sw: "Jina", en: "Name" },
  "common.department": { sw: "Wizara / Idara", en: "Ministry / Department" },
  "common.page_not_found": { sw: "Ukurasa haupatikani", en: "Page not found" },
  "common.page_not_found_sub": {
    sw: "Ukurasa unaoutafuta haupo au umehamishwa.",
    en: "The page you're looking for doesn't exist or has been moved.",
  },
  "common.page_failed": { sw: "Ukurasa huu haukupakia", en: "This page didn't load" },
  "common.not_found": { sw: "Haipo", en: "Not found" },
  "common.try_again": { sw: "Jaribu tena", en: "Try again" },
  "nav.menu": { sw: "Menyu", en: "Menu" },
  "common.page_failed_sub": {
    sw: "Kuna hitilafu upande wetu. Unaweza kujaribu kusasisha au kurudi nyumbani.",
    en: "Something went wrong on our end. You can try refreshing or head back home.",
  },

  // ===== Nyumbani / Home =====
  "home.welcome": { sw: "Karibu MUMSO", en: "Welcome to MUMSO" },
  "home.hero_1": { sw: "Karibu", en: "Welcome to" },
  "home.intro": {
    sw: "Mfumo rasmi wa MUMSO unaokuunganisha na viongozi wako — tuma huduma, fuatilia mikopo, na pata habari kwa wakati.",
    en: "The official MUMSO platform connecting you with your leaders — request services, follow up loans and get timely news.",
  },
  "home.cta_service": { sw: "Tuma Huduma", en: "Request a Service" },
  "home.cta_loan": { sw: "Ripoti Tatizo la Mkopo", en: "Report a Loan Issue" },
  "home.president": { sw: "Rais wa MUMSO", en: "MUMSO President" },
  "home.president_word": { sw: "Neno la Rais", en: "President's Message" },
  "home.loan_form_title": { sw: "Fomu ya Mkopo (HESLB)", en: "Loan Form (HESLB)" },
  "home.loan_form_sub": {
    sw: "Kiungo cha ndani cha fomu ya mkopo — bofya kufungua au nakili kiungo kushirikisha wanafunzi wenzio.",
    en: "The internal loan form link — open it or copy the link to share with fellow students.",
  },
  "home.loan_open": { sw: "Fungua Fomu ya Mkopo", en: "Open Loan Form" },
  "home.services": { sw: "Huduma Kuu", en: "Main Services" },
  "home.services_sub": {
    sw: "Chagua huduma uitakayo. Kila ombi linafikishwa moja kwa moja kwa viongozi.",
    en: "Choose the service you need. Every request goes straight to the leaders.",
  },
  "home.news": { sw: "Habari & Matangazo", en: "News & Announcements" },
  "home.news_sub": {
    sw: "Taarifa mpya kutoka kwa uongozi wa MUMSO.",
    en: "Latest updates from the MUMSO leadership.",
  },
  "home.news_all": { sw: "Matangazo yote", en: "All announcements" },
  "home.news_empty": { sw: "Hakuna matangazo kwa sasa.", en: "No announcements yet." },
  "home.news_new": { sw: "Jipya", en: "New" },
  "home.links": { sw: "Viungo Muhimu", en: "Useful Links" },
  "home.links_sub": {
    sw: "Bofya kufungua tovuti rasmi.",
    en: "Click to open the official website.",
  },
  "home.read": { sw: "Soma zaidi", en: "Read more" },
  "home.leaders_badge": { sw: "Uongozi Wetu", en: "Our Leadership" },
  "home.leaders": { sw: "Kutana na Viongozi Wetu", en: "Meet Our Leaders" },
  "home.leaders_sub": {
    sw: "Viongozi wa MUMSO wanaowatumikia wanafunzi kwa uaminifu na uwazi.",
    en: "The MUMSO leaders serving students with dedication and transparency.",
  },
  "home.leaders_all": { sw: "Ona viongozi wote", en: "View all leaders" },
  "home.service_1_title": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "home.service_1_desc": {
    sw: "Tuma huduma za kitaaluma, kifedha, afya na ushauri.",
    en: "Submit academic, financial, health and counselling requests.",
  },
  "home.service_2_title": { sw: "Huduma ya Mikopo", en: "Loan Services" },
  "home.service_2_desc": {
    sw: "Ripoti matatizo ya disbursement, allocation, appeal na zaidi.",
    en: "Report disbursement, allocation, appeal and other issues.",
  },
  "home.service_3_title": { sw: "Taarifa za Misiba", en: "Obituary Notices" },
  "home.service_3_desc": {
    sw: "Toa taarifa ya msiba na pokea pole kutoka kwa wanafunzi wenzio.",
    en: "Report a bereavement and receive condolences from fellow students.",
  },
  "home.service_4_title": { sw: "Matangazo", en: "Announcements" },
  "home.service_4_desc": {
    sw: "Pata taarifa muhimu na matangazo ya MUMSO.",
    en: "Get important notices and announcements from MUMSO.",
  },
  "home.typewriter_1": {
    sw: "Sauti ya Mwanafunzi, Suluhisho la Pamoja.",
    en: "The Student's Voice, Shared Solutions.",
  },
  "home.typewriter_2": {
    sw: "Karibu MUMSO — Tuma Huduma Yako.",
    en: "Welcome to MUMSO — Submit Your Request.",
  },
  "home.typewriter_3": { sw: "Fuatilia Mikopo Yako Kwa Wakati.", en: "Track Your Loan On Time." },
  "home.typewriter_4": {
    sw: "Pata Matangazo Mapya Moja Kwa Moja.",
    en: "Get Fresh Announcements Directly.",
  },
  "home.visitors": { sw: "Wageni wa Leo", en: "Today's Visitors" },

  // ===== Kuhusu / About =====
  "about.title": { sw: "Kuhusu MUMSO", en: "About MUMSO" },
  "about.lead": {
    sw: "MUMSO (Muslim University of Morogoro Students Organization) ni chombo rasmi cha uongozi wa wanafunzi kinachofanya kazi kuhakikisha sauti za wanafunzi zinasikika, huduma zinapatikana kwa urahisi, na maombi yanashughulikiwa kwa wakati.",
    en: "MUMSO (Muslim University of Morogoro Students Organization) is the official student leadership body working to make sure students' voices are heard, services are easy to reach, and requests are handled on time.",
  },
  "about.goal": { sw: "Lengo", en: "Mission" },
  "about.goal_desc": {
    sw: "Kuwa daraja madhubuti kati ya wanafunzi, uongozi wa chuo, na taasisi za mikopo.",
    en: "To be a strong bridge between students, university leadership and lending institutions.",
  },
  "about.vision": { sw: "Dira", en: "Vision" },
  "about.vision_desc": {
    sw: "Mwanafunzi anayejiamini, anayepata haki na huduma kwa wakati popote alipo.",
    en: "A confident student who receives justice and services on time, wherever they are.",
  },
  "about.duty": { sw: "Wajibu Wetu", en: "Our Duty" },
  "about.duty_desc": {
    sw: "Kuratibu huduma, kushughulikia mikopo, na kutoa taarifa muhimu kwa wanafunzi wote.",
    en: "Coordinate services, handle loans, and provide important information to all students.",
  },

  // ===== Uongozi / Leadership =====
  "leaders.empty": { sw: "Hakuna viongozi walioongezwa bado.", en: "No leaders published yet." },
  "leaders.not_found": { sw: "Kiongozi huyu hajapatikana.", en: "This leader was not found." },
  "leaders.back": { sw: "Rudi kwa viongozi", en: "Back to leaders" },
  "leaders.bio": { sw: "Wasifu na Neno Lake", en: "Biography & Message" },
  "leaders.search": { sw: "Tafuta jina au cheo…", en: "Search name or position…" },
  "leaders.count": { sw: "viongozi", en: "leaders" },
  "leaders.none_match": { sw: "Hakuna kiongozi anayelingana na", en: "No leader matches" },
  "leaders.role_label": { sw: "Cheo", en: "Position" },
  "leaders.duty_label": { sw: "Jukumu", en: "Role" },
  "leaders.duty_value": { sw: "Uongozi wa MUMSO", en: "MUMSO Leadership" },
  "leaders.contact_label": { sw: "Mawasiliano", en: "Contact" },
  "leaders.share_profile": { sw: "Shiriki wasifu", en: "Share profile" },
  "leaders.other_leaders": { sw: "Viongozi Wengine", en: "Other Leaders" },
  "leaders.signup_cta_title": { sw: "Wewe ni kiongozi wa MUMSO?", en: "Are you a MUMSO leader?" },
  "leaders.signup_cta_sub": {
    sw: "Jisajili ili uweze kuidhinishwa na menejimenti na kupata dashibodi yako ya wizara.",
    en: "Register so management can approve you and you get your ministry dashboard.",
  },

  // ===== Huduma / Services index =====
  "services.title": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "services.lead": {
    sw: "MUMSO imepangwa kama serikali ndogo yenye Idara/Wizara. Chagua idara husika ili kutuma ombi lako moja kwa moja kwa kiongozi wa idara hiyo.",
    en: "MUMSO is organised like a small government with ministries and departments. Choose the relevant one to send your request straight to its leader.",
  },
  "services.none": {
    sw: "Hakuna wizara zilizosajiliwa bado.",
    en: "No ministries have been registered yet.",
  },
  "services.my_ministry": { sw: "Wizara yangu", en: "My ministry" },
  "services.my_ministry_first": {
    sw: "Wizara uliyochagua inaonekana kwanza.",
    en: "Your selected ministry is shown first.",
  },
  "services.open_dept": { sw: "Ingia kwenye wizara", en: "Open the ministry" },
  "services.dept_leader": { sw: "Kiongozi", en: "Leader" },

  // ===== Fomu za huduma / Service forms (shared) =====
  "form.verify_reg": { sw: "Thibitisha REG Namba Yako", en: "Verify Your Registration Number" },
  "form.reg_number": { sw: "REG Namba ya Chuo", en: "University Registration Number" },
  "form.reg_placeholder": { sw: "Mf. MUM2021-04-07625", en: "e.g. MUM2021-04-07625" },
  "form.reg_verified": { sw: "REG imethibitishwa", en: "Registration verified" },
  "form.change_student": { sw: "Badili mwanafunzi", en: "Change student" },
  "form.reg_searching": { sw: "Inatafuta…", en: "Searching…" },
  "form.register_student": { sw: "Jisajili Mwanafunzi", en: "Register as a student" },
  "form.full_name": { sw: "Majina Kamili", en: "Full Name" },
  "form.phone": { sw: "Namba ya Simu", en: "Phone Number" },
  "form.course": { sw: "Kozi", en: "Course" },
  "form.year": { sw: "Mwaka wa Masomo", en: "Year of Study" },
  "form.gender": { sw: "Jinsia", en: "Gender" },
  "form.gender_male": { sw: "Mwanaume", en: "Male" },
  "form.gender_female": { sw: "Mwanamke", en: "Female" },
  "form.description": { sw: "Maelezo", en: "Description" },
  "form.description_placeholder": {
    sw: "Andika maelezo yako hapa...",
    en: "Write your details here...",
  },
  "form.category": { sw: "Aina ya Huduma", en: "Service Type" },
  "form.category_placeholder": { sw: "Chagua aina ya huduma", en: "Select a service type" },
  "form.attachment": { sw: "Ambatanisha Faili", en: "Attach a File" },
  "form.choose_file": { sw: "Chagua faili", en: "Choose file" },
  "form.remove_file": { sw: "Ondoa faili", en: "Remove file" },
  "form.attachment_hint": {
    sw: "Inaruhusiwa: PDF, Word au picha (JPG/PNG). Ukubwa usizidi MB 5.",
    en: "Allowed: PDF, Word or image (JPG/PNG). Maximum size 5 MB.",
  },
  "form.submit_service": { sw: "Tuma Ombi la Huduma", en: "Submit Service Request" },
  "form.submit_generic": { sw: "Tuma Ombi", en: "Submit Request" },
  "form.description_or_file": {
    sw: "Andika maelezo ya huduma unayohitaji au ambatanisha faili.",
    en: "Write the details of the service you need or attach a file.",
  },
  "form.verify_first": {
    sw: "Thibitisha REG namba yako kwanza.",
    en: "Verify your registration number first.",
  },
  "form.step_identity": { sw: "Utambulisho wako", en: "Your identity" },
  "form.step_identity_hint": {
    sw: "Weka REG namba yako kwanza — taarifa zako zitatokea zenyewe.",
    en: "Enter your REG number first — your details load automatically.",
  },
  "form.step_request": { sw: "Ombi lako", en: "Your request" },
  "form.step_details": { sw: "Maelezo ya ombi", en: "Request details" },
  "form.step_attachment": { sw: "Kiambatisho", en: "Attachment" },
  "form.step_submit": { sw: "Tuma ombi", en: "Send request" },
  "form.step_submit_hint": {
    sw: "Angalia taarifa zako kisha tuma. Utapata namba ya kufuatilia ombi lako.",
    en: "Check your details then send. You will receive a tracking number for your request.",
  },
  "form.err_bad_reg": {
    sw: "Andika REG namba sahihi ya chuo.",
    en: "Enter a valid university registration number.",
  },
  "form.err_lookup_failed": {
    sw: "Taarifa hazijapatikana kwa sasa. Jaribu tena.",
    en: "Details are unavailable right now. Try again.",
  },
  "form.err_not_registered": {
    sw: "REG namba hii haijasajiliwa. Jisajili kwanza.",
    en: "This registration number is not registered yet. Register first.",
  },
  "form.err_connection": {
    sw: "Muunganisho umeshindikana. Jaribu tena.",
    en: "The connection failed. Try again.",
  },
  "form.err_duplicate_reg": {
    sw: "REG namba hii imeshasajiliwa tayari.",
    en: "This registration number is already registered.",
  },
  "form.verify_first_hint": {
    sw: "Andika REG namba yako hapo juu — taarifa zako zitatoka moja kwa moja.",
    en: "Enter your registration number above — your details will be filled in automatically.",
  },
  "form.fill_all": { sw: "Tafadhali jaza taarifa zote.", en: "Please fill in all the fields." },
  "form.file_too_big": {
    sw: "Faili ni kubwa mno (kikomo MB 5).",
    en: "The file is too large (limit 5 MB).",
  },
  "form.file_type_error": {
    sw: "Faili linaruhusiwa: PDF, Word au picha (JPG/PNG).",
    en: "Allowed files: PDF, Word or image (JPG/PNG).",
  },
  "form.received_title": { sw: "Ombi limepokelewa", en: "Request received" },
  "form.upload_failed": { sw: "Imeshindikana kupakia faili", en: "Could not upload the file" },
  "form.error_prefix": { sw: "Hitilafu", en: "Error" },
  "form.deadline": { sw: "Mwisho wa muda", en: "Deadline" },
  "form.optional": { sw: "hiari", en: "optional" },

  // ===== Fomu ya idara / Department form =====
  "dept.loading": { sw: "Inapakia idara...", en: "Loading department..." },
  "dept.all_depts": { sw: "Idara zote", en: "All departments" },
  "dept.leader_of": { sw: "Kiongozi wa Idara", en: "Department Leader" },
  "dept.only_notice": {
    sw: "Fomu hii inaenda moja kwa moja kwa",
    en: "This form goes directly to",
  },
  "dept.only_notice_end": { sw: "pekee.", en: "only." },
  "dept.send_to": { sw: "Tuma kwa", en: "Send to" },

  // ===== Mikopo / Loans =====
  "loan.title": { sw: "Huduma ya Mikopo", en: "Loan Services" },
  "loan.lead": {
    sw: "Jaza fomu hii kuomba huduma yoyote inayohusu mkopo wako wa HESLB.",
    en: "Fill in this form to request any service related to your HESLB loan.",
  },
  "loan.type": { sw: "Chagua Aina ya Huduma", en: "Choose the Service Type" },
  "loan.form_four": { sw: "Namba ya Kidato cha Nne", en: "Form Four Index Number" },
  "loan.form_four_placeholder": { sw: "Mf. S2325.0982.2020", en: "e.g. S2325.0982.2020" },
  "loan.details": { sw: "Maelezo ya Ombi", en: "Request Details" },
  "loan.received": {
    sw: "Ombi lako la mkopo limepokelewa. Tutawasiliana nawe.",
    en: "Your loan request has been received. We will get back to you.",
  },

  // ===== Changamoto / Challenges =====
  "chal.title": { sw: "Huduma", en: "Services" },
  "chal.lead": {
    sw: "Andika REG namba yako — taarifa zako zitatoka moja kwa moja, kisha tuma changamoto yako kwa wizara husika.",
    en: "Enter your registration number — your details are filled in automatically, then send your issue to the relevant ministry.",
  },
  "chal.department": { sw: "Wizara / Idara Husika", en: "Relevant Ministry / Department" },
  "chal.department_placeholder": { sw: "Chagua wizara", en: "Select a ministry" },
  "chal.type": { sw: "Aina ya Changamoto", en: "Type of Issue" },
  "chal.type_placeholder": { sw: "Chagua aina", en: "Select a type" },
  "chal.bereavement": { sw: "Kufiwa (Msiba)", en: "Bereavement (Funeral)" },
  "chal.details": { sw: "Maelezo ya Changamoto Yako", en: "Details of Your Issue" },
  "chal.details_placeholder": {
    sw: "Eleza changamoto yako kwa ufupi...",
    en: "Briefly describe your issue...",
  },
  "chal.submit": { sw: "Tuma kwa Wizara Husika", en: "Send to the Relevant Ministry" },
  "chal.received": {
    sw: "Ombi lako limefikia wizara husika. Asante!",
    en: "Your request has reached the relevant ministry. Thank you!",
  },

  // ===== Misiba / Obituaries =====
  "death.title": { sw: "Taarifa ya Msiba", en: "Obituary Notice" },
  "death.lead": {
    sw: "Jaza fomu hii na taarifa yako itafika kwa uongozi wa MUMSO moja kwa moja.",
    en: "Fill in this form and your notice goes straight to the MUMSO leadership.",
  },
  "death.deceased": { sw: "Jina la Marehemu", en: "Name of the Deceased" },
  "death.relationship": { sw: "Uhusiano (mfano: baba)", en: "Relationship (e.g. father)" },
  "death.date": { sw: "Tarehe ya Msiba", en: "Date of Bereavement" },
  "death.location": { sw: "Mahali", en: "Location" },
  "death.details": { sw: "Maelezo", en: "Details" },
  "death.submit": { sw: "Tuma Taarifa", en: "Submit Notice" },
  "death.received_title": { sw: "Taarifa imepokelewa", en: "Notice received" },
  "death.received": {
    sw: "Taarifa imepokelewa. Tunakupa pole.",
    en: "The notice has been received. Our condolences.",
  },

  // ===== Ufuatiliaji / Tracking =====
  "track.title": { sw: "Fuatilia Ombi Lako", en: "Track Your Request" },
  "track.lead": {
    sw: "Weka namba yako ya kufuatilia ya tarakimu sita uliyopewa baada ya kutuma ombi.",
    en: "Enter the six-digit tracking number you received after submitting your request.",
  },
  "track.code_label": { sw: "Namba ya kufuatilia", en: "Tracking number" },
  "track.code_placeholder": { sw: "Mf. 123456", en: "e.g. 123456" },
  "track.searching": { sw: "Inatafuta ombi lako...", en: "Looking up your request..." },
  "track.results_note": {
    sw: "Matokeo yatafunguka kwenye ukurasa wake mwenyewe.",
    en: "Results will open on their own page.",
  },
  "track.forgot": { sw: "Nimesahau namba yangu ya kufuatilia", en: "I forgot my tracking number" },
  "track.forgot_title": { sw: "Nimesahau namba", en: "I forgot my number" },
  "track.forgot_lead": {
    sw: "Weka namba yako ya simu na jina lako la mwisho kama ulivyojaza kwenye fomu.",
    en: "Enter your phone number and your last name exactly as you filled them in the form.",
  },
  "track.last_name": { sw: "Jina la mwisho", en: "Last name" },
  "track.get_code": { sw: "Pata namba", en: "Get number" },
  "track.no_results": {
    sw: "Hakuna ombi lililopatikana. Hakikisha unatumia namba ya simu au namba ya usajili uliyoweka kwenye fomu.",
    en: "No request found. Make sure you use the phone number or registration number you entered in the form.",
  },
  "track.no_match": {
    sw: "Hatukupata ombi lenye namba hii ya simu na jina hili la mwisho.",
    en: "We found no request with this phone number and last name.",
  },
  "track.insufficient": { sw: "Taarifa pungufu", en: "Missing information" },
  "track.insufficient_msg": {
    sw: "Weka namba ya simu au namba ya usajili uliyotumia kwenye fomu.",
    en: "Enter the phone number or registration number you used in the form.",
  },
  "track.go": { sw: "Fuatilia", en: "Track" },
  "track.no_code": { sw: "Hakuna namba", en: "No number" },

  // ===== Matokeo / Results =====
  "results.title": { sw: "Matokeo ya Ufuatiliaji", en: "Tracking Results" },
  "results.for": { sw: "Taarifa zilizotafutwa kwa", en: "Results searched for" },
  "results.search_again": { sw: "Tafuta tena", en: "Search again" },
  "results.empty": {
    sw: "Hakuna ombi lililopatikana kwa taarifa hizi.",
    en: "No request found for these details.",
  },
  "results.back_track": { sw: "Rudi Kufuatilia", en: "Back to Tracking" },
  "results.stage_received": { sw: "Limepokelewa", en: "Received" },
  "results.stage_reviewing": { sw: "Linapitiwa", en: "Under review" },
  "results.stage_forwarded": { sw: "Kwa menejimenti", en: "With management" },
  "results.stage_done": { sw: "Limekamilika", en: "Completed" },
  "results.rejected": {
    sw: "Ombi hili limekataliwa. Wasiliana na ofisi ya MUMSO.",
    en: "This request was rejected. Please contact the MUMSO office.",
  },
  "results.needs_fix": {
    sw: "Uongozi umeomba urekebishe taarifa zako",
    en: "The leadership asked you to correct your details",
  },
  "results.needs_fix_default": {
    sw: "Tafadhali pitia taarifa zako na urekebishe zilizokosewa.",
    en: "Please review your details and correct what is wrong.",
  },
  "results.notes_done": {
    sw: "Maelekezo ya uongozi (ombi limekamilika)",
    en: "Leadership notes (request completed)",
  },
  "results.notes": { sw: "Maoni / maelekezo ya uongozi", en: "Leadership feedback / instructions" },
  "results.notes_none_done": {
    sw: "Ombi lako limekamilika. Uongozi haujaacha maelekezo ya ziada — wasiliana na ofisi ya MUMSO kwa msaada zaidi.",
    en: "Your request is complete. The leadership left no extra notes — contact the MUMSO office for further help.",
  },
  "results.notes_none": {
    sw: "Uongozi haujaacha maoni bado. Maelekezo yatatokea hapa mara ombi lako litakapopitiwa.",
    en: "The leadership has not left feedback yet. Instructions will appear here once your request is reviewed.",
  },
  "results.updated": { sw: "Imehuishwa", en: "Updated" },
  "results.replies": { sw: "Majibu ya wizara", en: "Ministry replies" },
  "results.reply_letter": { sw: "Barua", en: "Letter" },
  "results.reply_form": { sw: "Fomu", en: "Form" },
  "results.reply_message": { sw: "Ujumbe", en: "Message" },
  "results.download": { sw: "Pakua faili", en: "Download file" },
  "results.edit": { sw: "Rekebisha Taarifa", en: "Correct Details" },
  "results.delete": { sw: "Futa Ombi", en: "Delete Request" },
  "results.save_edits": { sw: "Hifadhi Marekebisho", en: "Save Changes" },
  "results.saved": {
    sw: "Marekebisho yako yamehifadhiwa na ombi lako limerudi kwa uongozi kwa ukaguzi.",
    en: "Your changes were saved and your request went back to the leadership for review.",
  },
  "results.deleted": {
    sw: "Ombi lako limefutwa kwenye mfumo.",
    en: "Your request was removed from the system.",
  },
  "results.deleted_title": { sw: "Ombi limefutwa", en: "Request deleted" },
  "results.confirm_delete": {
    sw: "Una uhakika unataka kufuta ombi hili?",
    en: "Are you sure you want to delete this request?",
  },
  "results.attachment_missing": {
    sw: "Faili haijapatikana. Jaribu tena.",
    en: "The file was not found. Please try again.",
  },
  "results.succeeded": { sw: "Imefanikiwa", en: "Success" },

  // ===== Usajili wa mwanafunzi / Student registration =====
  "signup.title": { sw: "Jisajili Mwanafunzi", en: "Student Registration" },
  "signup.lead": {
    sw: "Jisajili kwanza ili taarifa zako zitoke moja kwa moja kwenye fomu za huduma.",
    en: "Register first so your details are filled in automatically on service forms.",
  },

  // ===== Usajili wa kiongozi / Leader signup =====
  "lsignup.badge": { sw: "Usajili wa Viongozi", en: "Leader Registration" },
  "lsignup.title": { sw: "Jisajili kama Kiongozi", en: "Register as a Leader" },
  "lsignup.lead": {
    sw: "Hakuna uthibitisho wa barua pepe. Ombi lako linathibitishwa na Admin (Menejimenti), kisha unapata paneli yako ya kisasa ya wizara.",
    en: "No email verification needed. Your request is approved by the Admin (Management), then you get your modern ministry dashboard.",
  },
  "lsignup.step1": { sw: "Taarifa zako", en: "Your details" },
  "lsignup.step2": { sw: "Taaluma", en: "Academics" },
  "lsignup.step3": { sw: "Uongozi", en: "Leadership" },
  "lsignup.step4": { sw: "Nenosiri", en: "Password" },
  "lsignup.s1": { sw: "1. Taarifa zako", en: "1. Your details" },
  "lsignup.s2": { sw: "2. Taaluma", en: "2. Academics" },
  "lsignup.s3": { sw: "3. Nafasi yako ya uongozi", en: "3. Your leadership position" },
  "lsignup.s4": { sw: "4. Nenosiri", en: "4. Password" },
  "lsignup.position": { sw: "Cheo cha Uongozi", en: "Leadership Position" },
  "lsignup.position_placeholder": { sw: "Chagua cheo chako", en: "Select your position" },
  "lsignup.department": { sw: "Wizara / Idara Yako", en: "Your Ministry / Department" },
  "lsignup.department_placeholder": { sw: "Chagua wizara yako", en: "Select your ministry" },
  "lsignup.department_hint": {
    sw: "Baada ya kuidhinishwa na menejimenti, utaingia moja kwa moja kwenye dashibodi ya wizara hii.",
    en: "Once management approves you, you go straight into this ministry's dashboard.",
  },
  "lsignup.year_placeholder": { sw: "Chagua mwaka", en: "Select year" },
  "lsignup.password": { sw: "Nenosiri Unalotaka", en: "Choose Your Password" },
  "lsignup.password_hint": {
    sw: "Angalau herufi 8, changanya herufi kubwa, ndogo, namba na alama. Nenosiri rahisi (kama 12345678) hukataliwa.",
    en: "At least 8 characters mixing upper case, lower case, numbers and symbols. Weak passwords (like 12345678) are rejected.",
  },
  "lsignup.course_placeholder": { sw: "Mf. LLB / BBA / BEd", en: "e.g. LLB / BBA / BEd" },
  "lsignup.submit": { sw: "Tuma Ombi la Usajili", en: "Submit Registration Request" },
  "lsignup.already": { sw: "Tayari umeidhinishwa?", en: "Already approved?" },
  "lsignup.login_here": { sw: "Ingia hapa", en: "Sign in here" },
  "lsignup.done_title": { sw: "Ombi lako limepokelewa", en: "Your request has been received" },
  "lsignup.done_msg": {
    sw: "Menejimenti itaidhinisha usajili wako. Baada ya kuidhinishwa, ingia kwa REG namba yako na nenosiri ulilochagua — utaona dashibodi yako ya wizara pamoja na ukurasa wako wa kisasa wa wasifu unaoweza kuhariri mwenyewe.",
    en: "Management will approve your registration. Once approved, sign in with your registration number and chosen password — you will see your ministry dashboard and your own modern profile page that you can edit yourself.",
  },
  "lsignup.page_note": {
    sw: "Kila kiongozi anayeidhinishwa anapata ukurasa wake wa kisasa wa wasifu na anaweza kuubadilisha mwenyewe.",
    en: "Every approved leader gets their own modern profile page and can update it themselves.",
  },
  "lsignup.go_login": { sw: "Nenda Kuingia", en: "Go to Sign in" },
  "lsignup.register_another": { sw: "Sajili Mwingine", en: "Register another" },
  "lsignup.choose_dept": { sw: "Chagua wizara/idara yako", en: "Select your ministry/department" },
  "lsignup.year_label": { sw: "Mwaka wa Masomo", en: "Year of Study" },
  "lsignup.course_label": { sw: "Kozi Unayosomea", en: "Course You Are Studying" },
  "lsignup.year1": { sw: "Mwaka wa 1", en: "Year 1" },
  "lsignup.year2": { sw: "Mwaka wa 2", en: "Year 2" },
  "lsignup.year3": { sw: "Mwaka wa 3", en: "Year 3" },
  "lsignup.year4": { sw: "Mwaka wa 4", en: "Year 4" },
  "lsignup.year5": { sw: "Mwaka wa 5", en: "Year 5" },
  "lsignup.pos1": { sw: "Rais", en: "President" },
  "lsignup.pos2": { sw: "Makamu wa Rais", en: "Vice President" },
  "lsignup.pos3": { sw: "Katibu Mkuu", en: "Secretary General" },
  "lsignup.pos4": { sw: "Naibu Katibu Mkuu", en: "Deputy Secretary General" },
  "lsignup.pos5": { sw: "Mweka Hazina", en: "Treasurer" },
  "lsignup.pos6": { sw: "Waziri wa Idara", en: "Minister of Department" },
  "lsignup.pos7": { sw: "Naibu Waziri wa Idara", en: "Deputy Minister of Department" },
  "lsignup.pos8": { sw: "Katibu wa Idara", en: "Department Secretary" },
  "lsignup.pos9": { sw: "Mjumbe wa Kamati Kuu", en: "Central Committee Member" },
  "lsignup.err_name": { sw: "Andika jina kamili", en: "Enter your full name" },
  "lsignup.err_reg": { sw: "Andika REG namba yako", en: "Enter your registration number" },
  "lsignup.err_course": { sw: "Andika kozi unayosomea", en: "Enter the course you are studying" },
  "lsignup.err_year": { sw: "Chagua mwaka wa masomo", en: "Select your year of study" },
  "lsignup.err_position": { sw: "Chagua cheo chako", en: "Select your position" },
  "lsignup.err_phone": { sw: "Namba ya simu si sahihi", en: "The phone number is not valid" },
  "lsignup.err_password_len": {
    sw: "Nenosiri liwe herufi 8 au zaidi",
    en: "The password must be at least 8 characters",
  },
  "lsignup.err_password_letter": {
    sw: "Nenosiri liwe na herufi",
    en: "The password must contain a letter",
  },
  "lsignup.err_password_digit": {
    sw: "Nenosiri liwe na namba angalau moja",
    en: "The password must contain at least one number",
  },
  "lsignup.err_exists": {
    sw: "REG hii tayari ina akaunti. Ingia au wasiliana na menejimenti.",
    en: "This registration number already has an account. Sign in or contact management.",
  },
  "lsignup.err_weak": {
    sw: "Nenosiri hili ni dhaifu au linajulikana sana. Chagua nenosiri gumu zaidi (mf. Mumso#2026Kiongozi).",
    en: "This password is weak or too common. Choose a stronger one (e.g. Mumso#2026Kiongozi).",
  },
  "lsignup.err_generic": { sw: "Usajili haujakamilika.", en: "Registration did not complete." },
  "lsignup.err_save": { sw: "Ombi halijahifadhiwa", en: "The request was not saved" },

  // ===== Kuingia / Login =====
  "login.badge": { sw: "Eneo la Uongozi", en: "Leadership Area" },
  "login.title": { sw: "MUMSO Ingia", en: "MUMSO Sign in" },
  "login.lead": {
    sw: "Kwa viongozi na Menejimenti (Admin) pekee. Hakuna uthibitisho wa barua pepe.",
    en: "For leaders and Management (Admin) only. No email verification needed.",
  },
  "login.identifier": { sw: "Email au REG Namba", en: "Email or Registration Number" },
  "login.password": { sw: "Nenosiri", en: "Password" },
  "login.submit": { sw: "Ingia", en: "Sign in" },
  "login.note": {
    sw: "Akaunti zinathibitishwa na Menejimenti (Admin).",
    en: "Accounts are approved by Management (Admin).",
  },
  "login.leader_signup": { sw: "Jisajili kama Kiongozi", en: "Register as a Leader" },
  "login.track": { sw: "Fuatilia Huduma yako", en: "Track your request" },
  "login.welcome_admin": { sw: "Karibu Menejimenti!", en: "Welcome, Management!" },
  "login.welcome_leader": { sw: "Karibu Kiongozi!", en: "Welcome, Leader!" },
  "login.pending": {
    sw: "Akaunti yako inasubiri idhini ya Admin Mkuu.",
    en: "Your account is awaiting approval from the Admin.",
  },
  "login.no_department": {
    sw: "Akaunti yako haijapewa wizara. Wasiliana na menejimenti.",
    en: "Your account has no ministry assigned. Please contact management.",
  },
  "login.bad_credentials": {
    sw: "REG/Email au nenosiri si sahihi.",
    en: "Wrong registration number/email or password.",
  },

  // ===== Matangazo / Announcements =====
  "news.title": { sw: "Matangazo", en: "Announcements" },
  "news.lead": {
    sw: "Taarifa rasmi kutoka kwa uongozi wa MUMSO.",
    en: "Official notices from the MUMSO leadership.",
  },
  "news.empty": { sw: "Hakuna matangazo bado.", en: "No announcements yet." },
  "news.back": { sw: "Rudi kwenye matangazo", en: "Back to announcements" },
  "news.not_found": { sw: "Tangazo halipatikani.", en: "Announcement not found." },
  "news.badge": { sw: "Habari", en: "News" },
  "news.published_on": { sw: "Tarehe ya tangazo", en: "Announcement date" },
  "news.attachment": { sw: "Kiambatisho", en: "Attachment" },
  "news.open_pdf": { sw: "Fungua PDF", en: "Open PDF" },
  "news.from": { sw: "Kutoka", en: "From" },
  "news.latest": { sw: "Habari za hivi karibuni", en: "Latest news" },
  "news.submit": { sw: "Tuma Tangazo", en: "Submit Announcement" },
  "news.submit_lead": {
    sw: "Tuma tangazo lako kwa Wizara ya Habari na Mawasiliano; wao watahariri na kulichapisha.",
    en: "Send your announcement to the News & Communication Ministry; they will edit and publish it.",
  },
  "news.submitted": {
    sw: "Tangazo limetumwa kwa Wizara ya Habari.",
    en: "Announcement sent to the News Ministry.",
  },
  "news.my_submissions": { sw: "Matangazo ya wizara yako", en: "Your ministry's announcements" },
  "news.status": { sw: "Hali", en: "Status" },
  "news.st_draft": { sw: "Rasimu", en: "Draft" },
  "news.st_pending": { sw: "Inasubiri uhariri", en: "Awaiting review" },
  "news.st_published": { sw: "Imechapishwa", en: "Published" },
  "news.st_rejected": { sw: "Imerejeshwa", en: "Returned" },
  "news.review_note": { sw: "Maelezo ya mhariri", en: "Editor's note" },
  "news.publish": { sw: "Chapisha", en: "Publish" },
  "news.unpublish": { sw: "Ondoa kwenye wavuti", en: "Unpublish" },
  "news.return": { sw: "Rejesha kwa wizara", en: "Return to ministry" },
  "news.published_ok": { sw: "Tangazo limechapishwa", en: "Announcement published" },
  "news.newsroom": { sw: "Wizara ya Habari na Mawasiliano", en: "News & Communication Ministry" },
  "news.newsroom_only": {
    sw: "Kuchapisha matangazo ni kazi ya Wizara ya Habari na Mawasiliano.",
    en: "Publishing announcements belongs to the News & Communication Ministry.",
  },
  "news.author_ministry": { sw: "Wizara iliyotuma", en: "Submitted by ministry" },
  "news.attachment_hint": {
    sw: "Picha au PDF (si zaidi ya 10MB)",
    en: "Image or PDF (max 10MB)",
  },

  // ===== Mahafali / Graduation =====
  "grad.title": { sw: "Mahafali", en: "Graduation" },
  "grad.lead": {
    sw: "Taarifa za mahafali na maelekezo kwa wahitimu wa MUMSO.",
    en: "Graduation information and guidance for MUMSO graduands.",
  },
  "grad.empty": {
    sw: "Hakuna taarifa za mahafali kwa sasa.",
    en: "No graduation information yet.",
  },
  "grad.date": { sw: "Tarehe", en: "Date" },
  "grad.venue": { sw: "Mahali", en: "Venue" },

  // ===== Menejimenti / Management =====
  "mgmt.menu": { sw: "MENYU", en: "MENU" },
  "mgmt.management": { sw: "Menejimenti", en: "Management" },
  "mgmt.leader": { sw: "Kiongozi", en: "Leader" },
  "mgmt.admin": { sw: "Admin", en: "Admin" },
  "mgmt.ministry": { sw: "Wizara", en: "Ministry" },
  "mgmt.title": { sw: "Mfumo wa Menejimenti", en: "Management System" },
  "mgmt.leader_panel": { sw: "Paneli ya Kiongozi", en: "Leader Panel" },
  "mgmt.signout": { sw: "Toka", en: "Sign out" },
  "mgmt.search_requests": { sw: "Tafuta jina, REG au ombi…", en: "Search name, REG or request…" },
  "mgmt.site": { sw: "Tovuti ya MUMSO", en: "MUMSO Website" },
  "mgmt.tab_dashboard": { sw: "Dashibodi", en: "Dashboard" },
  "mgmt.group_requests": { sw: "Maombi", en: "Requests" },
  "mgmt.group_content": { sw: "Maudhui", en: "Content" },
  "mgmt.group_settings": { sw: "Mipangilio", en: "Settings" },
  "mgmt.group_people": { sw: "Watu", en: "People" },
  "mgmt.tab_student_services": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "mgmt.tab_challenges": { sw: "Changamoto", en: "Issues" },
  "mgmt.tab_loans": { sw: "Mikopo", en: "Loans" },
  "mgmt.tab_deaths": { sw: "Misiba", en: "Obituaries" },
  "mgmt.tab_announce": { sw: "Matangazo", en: "Announcements" },
  "mgmt.tab_banner": { sw: "Picha za Mwanzo", en: "Homepage Images" },
  "mgmt.tab_grad": { sw: "Mahafali", en: "Graduation" },
  "mgmt.tab_links": { sw: "Tovuti Muhimu", en: "Useful Links" },
  "mgmt.tab_departments": { sw: "Wizara / Idara", en: "Ministries / Departments" },
  "mgmt.tab_my_department": { sw: "Wizara Yangu", en: "My Ministry" },
  "mgmt.tab_categories": { sw: "Fomu za Idara", en: "Department Forms" },
  "mgmt.tab_services": { sw: "Mipangilio ya Huduma", en: "Service Settings" },
  "mgmt.tab_contact": { sw: "Mawasiliano", en: "Contact" },
  "mgmt.tab_leader_apps": { sw: "Usajili wa Viongozi", en: "Leader Registration" },
  "mgmt.tab_leaders": { sw: "Viongozi", en: "Leaders" },
  "mgmt.tab_users": { sw: "Watumiaji", en: "Users" },
  "mgmt.tab_password": { sw: "Nenosiri", en: "Password" },
  "mgmt.register_leader": { sw: "Jisajili Kiongozi", en: "Register Leader" },
  "mgmt.unauthorized_signup_hint": {
    sw: "Kama wewe ni kiongozi wa MUMSO, unaweza kutuma ombi la akaunti hapa.",
    en: "If you are a MUMSO leader, you can submit an account request here.",
  },
  "mgmt.welcome": { sw: "Karibu", en: "Welcome" },
  "mgmt.badge_admin": { sw: "Menejimenti (Admin)", en: "Management (Admin)" },
  "mgmt.badge_leader": { sw: "Kiongozi Aliyedhinishwa", en: "Approved Leader" },
  "mgmt.hero_admin": {
    sw: "Dashibodi kuu ya menejimenti — simamia maombi, wizara, viongozi na matangazo ya MUMSO.",
    en: "The main management dashboard — oversee requests, ministries, leaders and MUMSO announcements.",
  },
  "mgmt.hero_leader_prefix": { sw: "Paneli yako ya", en: "Your panel for" },
  "mgmt.hero_leader_suffix": {
    sw: "— shughulikia maombi ya wanafunzi wa idara yako.",
    en: "— handle the requests of your department's students.",
  },
  "mgmt.kpi_total": { sw: "Maombi yote", en: "All requests" },
  "mgmt.kpi_pending": { sw: "Yanasubiri", en: "Pending" },
  "mgmt.kpi_completed": { sw: "Yamekamilika", en: "Completed" },
  "mgmt.leader_approved": { sw: "Kiongozi Aliyedhinishwa", en: "Approved Leader" },
  "mgmt.overview_sub_admin": {
    sw: "Dashibodi kuu ya menejimenti — simamia maombi, wizara, viongozi na matangazo ya MUMSO.",
    en: "The main management dashboard — oversee requests, ministries, leaders and MUMSO announcements.",
  },
  "mgmt.from": { sw: "Kutoka", en: "From" },
  "mgmt.from_all": { sw: "Kutoka wizara zote", en: "From all ministries" },
  "mgmt.your_dept": { sw: "idara yako", en: "your department" },
  "mgmt.applicant": { sw: "Mwombaji", en: "Applicant" },
  "mgmt.request": { sw: "Ombi", en: "Request" },
  "mgmt.tab_my_dept_subs": { sw: "Huduma za Idara Yangu", en: "My Department's Services" },
  "mgmt.tab_my_dept_challenges": { sw: "Changamoto za Idara", en: "Department Issues" },
  "mgmt.kpi_done": { sw: "Yamekamilika", en: "Completed" },
  "mgmt.kpi_rejected": { sw: "Yamekataliwa", en: "Rejected" },
  "mgmt.recent": { sw: "Maombi ya Hivi Karibuni", en: "Recent Requests" },
  "mgmt.recent_all": { sw: "Kutoka wizara zote", en: "From all ministries" },
  "mgmt.recent_dept_prefix": { sw: "Kutoka", en: "From" },
  "mgmt.no_requests": { sw: "Hakuna maombi bado.", en: "No requests yet." },
  "mgmt.status_breakdown": { sw: "Hali ya Maombi", en: "Request Status" },
  "mgmt.quick_actions": { sw: "Njia za Haraka", en: "Quick Actions" },
  "mgmt.my_profile": { sw: "Wasifu Wangu", en: "My Profile" },
  "mgmt.open": { sw: "Fungua", en: "Open" },
  "mgmt.no_profile": {
    sw: "Wasifu wako wa umma bado haujaundwa. Fungua wizara yako kisha uhifadhi wasifu wako.",
    en: "Your public profile has not been created yet. Open your ministry and save your profile.",
  },
  "mgmt.open_my_dept": { sw: "Fungua Wizara Yangu", en: "Open My Ministry" },
  "mgmt.tab_my_profile": { sw: "Ukurasa Wangu", en: "My Page" },
  "mgmt.edit_profile": { sw: "Hariri Ukurasa Wangu", en: "Edit My Page" },
  "mgmt.edit_profile_lead": {
    sw: "Sasisha taarifa zako, neno lako na picha — mabadiliko yanaonekana mara moja kwenye ukurasa wako wa umma.",
    en: "Update your details, message and photo — changes appear on your public page right away.",
  },
  "mgmt.profile_photo": { sw: "Picha ya Wasifu", en: "Profile Photo" },
  "mgmt.profile_photo_hint": {
    sw: "PNG au JPG, hadi MB 3. Picha ya mraba inaonekana vizuri zaidi.",
    en: "PNG or JPG, up to 3 MB. A square photo looks best.",
  },
  "mgmt.upload_photo": { sw: "Pakia Picha", en: "Upload Photo" },
  "mgmt.uploading": { sw: "Inapakia...", en: "Uploading..." },
  "mgmt.short_message": { sw: "Neno Fupi (kadi)", en: "Short Message (card)" },
  "mgmt.bio": { sw: "Wasifu Kamili", en: "Full Biography" },
  "mgmt.save_profile": { sw: "Hifadhi Mabadiliko", en: "Save Changes" },
  "mgmt.saving": { sw: "Inahifadhi...", en: "Saving..." },
  "mgmt.profile_saved": { sw: "Ukurasa wako umehifadhiwa.", en: "Your page has been saved." },
  "mgmt.profile_save_failed": {
    sw: "Imeshindikana kuhifadhi ukurasa wako.",
    en: "Could not save your page.",
  },
  "mgmt.photo_saved": { sw: "Picha imehifadhiwa.", en: "Photo saved." },
  "mgmt.photo_failed": { sw: "Imeshindikana kupakia picha.", en: "Could not upload the photo." },
  "mgmt.photo_too_big": {
    sw: "Picha ni kubwa mno (kikomo MB 3).",
    en: "The photo is too large (limit 3 MB).",
  },
  "mgmt.photo_type": {
    sw: "Chagua faili la picha (PNG au JPG).",
    en: "Choose an image file (PNG or JPG).",
  },
  "mgmt.contact_details": { sw: "Mawasiliano", en: "Contact Details" },
  "mgmt.email": { sw: "Barua pepe", en: "Email" },
  "mgmt.profile_public_hint": {
    sw: "Ukurasa wako unaonekana kwenye Uongozi mara tu Menejimenti inapouchapisha.",
    en: "Your page appears under Leadership once Management publishes it.",
  },
  "mgmt.no_public_profile": {
    sw: "Wasifu wako wa umma bado haujaundwa. Menejimenti huunda wasifu kwenye kichupo cha Viongozi.",
    en: "Your public profile has not been created yet. Management creates profiles under the Leaders tab.",
  },
  "mgmt.no_public_profile_hint": {
    sw: "Mara Menejimenti inapounda wasifu wako, utaweza kuhariri picha, neno lako na mawasiliano yako hapa.",
    en: "Once Management creates your profile, you will be able to edit your photo, message and contacts here.",
  },
  "mgmt.profile_name": { sw: "Jina", en: "Name" },
  "mgmt.profile_position": { sw: "Cheo", en: "Position" },
  "mgmt.profile_state": { sw: "Hali", en: "Status" },
  "mgmt.profile_visible": { sw: "Inaonekana kwenye tovuti", en: "Visible on the website" },
  "mgmt.profile_hidden": { sw: "Imefichwa", en: "Hidden" },
  "mgmt.pending_leaders": { sw: "maombi ya viongozi", en: "leader applications" },
  "mgmt.reg_label": { sw: "REG", en: "REG" },

  // ===== Hali za maombi / Request statuses =====
  "status.pending": { sw: "Yanasubiri", en: "Pending" },
  "status.reviewing": { sw: "Yanapitiwa", en: "Under review" },
  "status.needs_correction": { sw: "Yanahitaji marekebisho", en: "Needs correction" },
  "status.forwarded": { sw: "Yamepelekwa kwa uongozi", en: "Forwarded to management" },
  "status.approved": { sw: "Yamekamilika", en: "Completed" },
  "status.completed": { sw: "Yamekamilika", en: "Completed" },
  "status.rejected": { sw: "Yamekataliwa", en: "Rejected" },

  // ===== Ujumbe wa namba ya kufuatilia / Tracking code message =====
  "trackcode.label": { sw: "NAMBA YAKO YA KUFUATILIA", en: "YOUR TRACKING NUMBER" },
  "trackcode.keep": {
    sw: 'Tunza namba hii. Ukiisahau, weka namba yako ya simu na jina lako la mwisho kwenye ukurasa wa "Fuatilia Ombi".',
    en: 'Keep this number safe. If you forget it, enter your phone number and last name on the "Track Request" page.',
  },

  // ===== Kichwa na kijachini / Site chrome =====
  "site.org_line1": { sw: "MUSLIM UNIVERSITY OF MOROGORO", en: "MUSLIM UNIVERSITY OF MOROGORO" },
  "site.org_line2": { sw: "STUDENTS ORGANIZATION", en: "STUDENTS ORGANIZATION" },
  "site.about": { sw: "Kuhusu MUMSO", en: "About MUMSO" },
  "site.about_text": {
    sw: "Muslim University of Morogoro Students Organization (MUMSO) — sauti ya mwanafunzi, mfumo rasmi wa mawasiliano, mikopo na huduma.",
    en: "Muslim University of Morogoro Students Organization (MUMSO) — the student's voice, the official platform for communication, loans and services.",
  },
  "site.important_links": { sw: "Tovuti Muhimu", en: "Useful Links" },
  "site.services": { sw: "Huduma", en: "Services" },
  "site.contact": { sw: "Wasiliana Nasi", en: "Contact Us" },
  "site.no_links": { sw: "Hakuna viungo bado.", en: "No links yet." },
  "site.rights": { sw: "Haki zote zimehifadhiwa.", en: "All rights reserved." },
  "site.designed_by": { sw: "Imeundwa na", en: "Designed & Developed by" },
  "site.system": { sw: "Mfumo", en: "System" },

  // ===== Matengenezo / Maintenance =====
  "maint.notice": { sw: "MUMSO • Taarifa ya Mfumo", en: "MUMSO • System Notice" },
  "maint.title": { sw: "Mfumo Umefungwa kwa Muda", en: "System Temporarily Closed" },
  "maint.default": {
    sw: "Huduma za MUMSO zimefungwa kwa muda kwa matengenezo. Tafadhali jaribu tena baadaye.",
    en: "MUMSO services are temporarily closed for maintenance. Please try again later.",
  },
  "maint.remaining": { sw: "Muda uliobaki", en: "Time remaining" },
  "maint.days": { sw: "Siku", en: "Days" },
  "maint.hours": { sw: "Saa", en: "Hours" },
  "maint.minutes": { sw: "Dakika", en: "Minutes" },
  "maint.seconds": { sw: "Sekunde", en: "Seconds" },
  "maint.reopen": { sw: "Mfumo unatarajiwa kufunguliwa", en: "The system is expected to reopen" },

  // ===== Kipima muda / Countdown =====
  "countdown.remaining": { sw: "Muda uliobaki", en: "Time remaining" },
  "countdown.over": { sw: "Muda umeisha", en: "Time is up" },
  "countdown.closed": {
    sw: "Muda wa kutuma maombi kwa huduma hii umefungwa.",
    en: "The submission window for this service has closed.",
  },
  "countdown.days": { sw: "Siku", en: "Days" },
  "countdown.hours": { sw: "Masaa", en: "Hours" },
  "countdown.minutes": { sw: "Dakika", en: "Minutes" },
  "countdown.seconds": { sw: "Sekunde", en: "Seconds" },

  // ===== Wageni / Visitors =====
  "visitors.title": { sw: "Wageni wa Mfumo", en: "Platform Visitors" },
  "visitors.today": { sw: "Wageni leo", en: "Visitors today" },
  "visitors.eat": { sw: "Saa za Afrika Mashariki", en: "East Africa Time" },
  "visitors.unavailable": {
    sw: "Takwimu hazipatikani kwa sasa",
    en: "Statistics are unavailable right now",
  },
  "visitors.one_per_day": {
    sw: "Kivinjari kimoja huhesabiwa mara moja kwa siku",
    en: "One browser counts once per day",
  },
  "visitors.last7": { sw: "Siku 7 zilizopita", en: "Last 7 days" },
  "visitors.aria": { sw: "Takwimu za wageni", en: "Visitor statistics" },

  // ===== Mahafali ya nyongeza / Graduation extras =====
  "grad.hero_sub": {
    sw: "Kumbukumbu, picha na taarifa za mahafali mbalimbali ya wahitimu wetu — sherehe ya mafanikio, elimu na maadili.",
    en: "Records, photos and information about our graduands' ceremonies — celebrating achievement, education and values.",
  },
  "grad.records": { sw: "Kumbukumbu za Mahafali", en: "Graduation Records" },
  "grad.records_sub": {
    sw: "Historia ya mahafali yaliyopita ya Chuo Kikuu cha Kiislamu cha Morogoro.",
    en: "The history of past graduation ceremonies at the Muslim University of Morogoro.",
  },

  // ===== Paneli ya wizara / Ministry workspace =====
  "mw.my_ministry": { sw: "Wizara Yangu", en: "My Ministry" },
  "mw.sections": { sw: "Sehemu za paneli", en: "Panel sections" },
  "mw.services": { sw: "Huduma za Wanafunzi", en: "Student Services" },
  "mw.challenges": { sw: "Changamoto", en: "Issues" },
  "mw.services_short": { sw: "huduma", en: "requests" },
  "mw.challenges_short": { sw: "changamoto", en: "issues" },
  "mw.no_services": {
    sw: "Hakuna huduma iliyotumwa na wanafunzi kwa wizara yako bado.",
    en: "No student services have been submitted to your ministry yet.",
  },
  "mw.no_challenges": {
    sw: "Hakuna changamoto iliyotumwa kwa wizara yako bado.",
    en: "No issues have been submitted to your ministry yet.",
  },
  "mw.filter_stage": { sw: "Chuja kwa hatua", en: "Filter by stage" },
  "mw.all": { sw: "Zote", en: "All" },
  "mw.change_stage": { sw: "Badili hatua", en: "Change stage" },
  "mw.note_placeholder": {
    sw: "Maelezo kwa mwanafunzi (yataonekana kwenye ufuatiliaji)…",
    en: "Note for the student (shown in tracking)…",
  },
  "mw.save_stage": { sw: "Hifadhi hatua", en: "Save stage" },
  "mw.stage_saved": { sw: "Hatua ya ombi imehifadhiwa", en: "Request stage saved" },
  "mw.stage_received": { sw: "Limepokelewa", en: "Received" },
  "mw.stage_review": { sw: "Linapitiwa", en: "Under review" },
  "mw.stage_forwarded": { sw: "Kwa uongozi", en: "With management" },
  "mw.stage_done": { sw: "Limekamilika", en: "Completed" },
  "mw.rejected_note": {
    sw: "Ombi limekataliwa. Wasiliana na ofisi ya MUMSO kwa maelezo zaidi.",
    en: "The request was declined. Contact the MUMSO office for more details.",
  },

  // ===== Ripoti ya wiki =====
  "mw.report": { sw: "Ripoti ya Wiki", en: "Weekly Report" },
  "mw.report_lead": {
    sw: "Andika kazi ulizofanya wiki hii; Rais na Waziri Mkuu wataona ripoti ya wizara yako.",
    en: "Describe the work you did this week; the President and Prime Minister will see your ministry's report.",
  },
  "mw.handled_auto": { sw: "Maombi yaliyopokelewa wiki hii", en: "Requests received this week" },
  "mw.report_summary": { sw: "Kazi zilizofanyika", en: "Work completed" },
  "mw.report_summary_ph": {
    sw: "Mfano: tulipokea maombi 12, tuliyapitia na kuyapeleka kwa uongozi…",
    en: "Example: we received 12 requests, reviewed them and forwarded them…",
  },
  "mw.report_challenges": { sw: "Changamoto zilizojitokeza", en: "Challenges faced" },
  "mw.report_next": { sw: "Mpango wa wiki ijayo", en: "Plan for next week" },
  "mw.report_submit": { sw: "Tuma ripoti", en: "Submit report" },
  "mw.report_update": { sw: "Sahihisha ripoti", en: "Update report" },
  "mw.report_saved": { sw: "Ripoti ya wiki imehifadhiwa", en: "Weekly report saved" },
  "mw.report_too_short": {
    sw: "Andika angalau sentensi moja kuhusu kazi ulizofanya.",
    en: "Write at least one sentence about the work you did.",
  },
  "mw.report_history": { sw: "Ripoti zilizopita", en: "Previous reports" },
  "mw.no_reports": { sw: "Hakuna ripoti bado.", en: "No reports yet." },
  "mw.no_ministry": {
    sw: "Akaunti yako haijaunganishwa na wizara. Wasiliana na menejimenti.",
    en: "Your account is not linked to a ministry. Contact management.",
  },

  // ===== Mawasiliano ya ndani =====
  "mw.messages": { sw: "Mawasiliano", en: "Messages" },
  "mw.compose": { sw: "Tuma ujumbe", en: "Send a message" },
  "mw.channel": { sw: "Aina ya ujumbe", en: "Message type" },
  "mw.to_pm": { sw: "Kwa Waziri Mkuu", en: "To the Prime Minister" },
  "mw.to_pm_lead": {
    sw: "Wasilisha tatizo au ombi kwa Katibu Mkuu",
    en: "Raise an issue or request with the Secretary General",
  },
  "mw.to_news": { sw: "Kwa Wizara ya Habari", en: "To the News Ministry" },
  "mw.to_news_lead": {
    sw: "Omba tangazo lako lichapishwe",
    en: "Request that your announcement be published",
  },
  "mw.recipient": { sw: "Mpokeaji", en: "Recipient" },
  "mw.choose_recipient": { sw: "Chagua mpokeaji", en: "Choose a recipient" },
  "mw.subject": { sw: "Kichwa", en: "Subject" },
  "mw.message": { sw: "Ujumbe", en: "Message" },
  "mw.send_message": { sw: "Tuma ujumbe", en: "Send message" },
  "mw.message_sent": { sw: "Ujumbe umetumwa", en: "Message sent" },
  "mw.message_too_short": {
    sw: "Kichwa na ujumbe ni mafupi mno.",
    en: "The subject and message are too short.",
  },
  "mw.inbox": { sw: "Kikasha", en: "Inbox" },
  "mw.sent": { sw: "Zilizotumwa", en: "Sent" },
  "mw.no_inbox": { sw: "Hakuna ujumbe uliopokelewa.", en: "No messages received." },
  "mw.no_sent": { sw: "Hakuna ujumbe uliotumwa.", en: "No messages sent." },
  "mw.mark_read": { sw: "Weka alama ya kusomwa", en: "Mark as read" },
  "mw.news_requests": { sw: "Maombi ya matangazo", en: "Announcement requests" },
  "mw.from_ministry": { sw: "Kutoka", en: "From" },
  "mw.unknown_ministry": { sw: "Wizara isiyojulikana", en: "Unknown ministry" },
  "mw.channel_news": { sw: "Wizara ya Habari", en: "News Ministry" },
  "mw.channel_direct": { sw: "Ujumbe wa moja kwa moja", en: "Direct message" },

  // ===== Muhtasari wa Rais na Waziri Mkuu =====
  "mw.cabinet_title": { sw: "Ripoti za Wizara Zote", en: "All Ministry Reports" },
  "mw.reported_this_week": {
    sw: "wizara zimeripoti wiki hii",
    en: "ministries reported this week",
  },
  "mw.handled_total": { sw: "maombi yaliyoshughulikiwa", en: "requests handled" },
  "mw.reported": { sw: "Imeripoti", en: "Reported" },
  "mw.not_reported": { sw: "Hakuna ripoti", en: "No report" },
  "mw.awaiting_report": {
    sw: "Wizara hii haijatuma ripoti ya wiki hii.",
    en: "This ministry has not submitted this week's report.",
  },
  "mw.no_ministries": { sw: "Hakuna wizara bado.", en: "No ministries yet." },

  // ===== Kidhibiti cha picha za mwanzo / Banner manager =====
  "bm.lead": {
    sw: "Pakia picha za banner zinazopita kwenye ukurasa wa nyumbani. Unaweza kupanga mfululizo.",
    en: "Upload banner images that rotate on the home page. You can reorder them.",
  },
  "bm.caption": { sw: "Maelezo ya picha", en: "Image caption" },
  "bm.caption_ph": { sw: "Mfano: Lango la chuo", en: "Example: the campus gate" },
  "bm.choose": { sw: "Chagua picha", en: "Choose image" },
  "bm.empty": { sw: "Hakuna picha bado.", en: "No images yet." },
  "bm.uploaded": { sw: "Picha imeongezwa", en: "Image added" },
  "bm.caption_saved": { sw: "Maelezo yamehifadhiwa", en: "Caption saved" },
  "bm.move_up": { sw: "Pandisha juu", en: "Move up" },
  "bm.move_down": { sw: "Shusha chini", en: "Move down" },
  "bm.confirm_delete": { sw: "Futa picha hii?", en: "Delete this image?" },
  "bm.too_large": { sw: "Picha isizidi MB 10.", en: "Image must not exceed 10 MB." },
  "bm.only_images": { sw: "Chagua faili la picha.", en: "Choose an image file." },

  // ===== Kubadilisha nenosiri =====
  "pw.title": { sw: "Badili Nenosiri", en: "Change Password" },
  "pw.lead": {
    sw: "Nenosiri lako ni siri yako. Menejimenti haiwezi kuliona.",
    en: "Your password is private. Management cannot see it.",
  },
  "pw.current": { sw: "Nenosiri la sasa", en: "Current password" },
  "pw.new": { sw: "Nenosiri jipya", en: "New password" },
  "pw.confirm": { sw: "Thibitisha nenosiri jipya", en: "Confirm new password" },
  "pw.save": { sw: "Hifadhi nenosiri", en: "Save password" },
  "pw.changed": { sw: "Nenosiri limebadilishwa", en: "Password changed" },
  "pw.mismatch": { sw: "Manenosiri hayafanani", en: "The passwords do not match" },
  "pw.too_short": { sw: "Nenosiri liwe na herufi 6 au zaidi", en: "Use at least 6 characters" },
  "pw.same": {
    sw: "Nenosiri jipya linafanana na la sasa",
    en: "The new password matches the current one",
  },

  // ===== Nyongeza za jumla =====
  "common.save": { sw: "Hifadhi", en: "Save" },
  "common.save_changes": { sw: "Hifadhi mabadiliko", en: "Save changes" },
};

export type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  /** Tag ya lugha kwa ajili ya tarehe/namba (mf. Intl). */
  locale: string;
};

const LangCtx = createContext<I18n>({
  lang: "sw",
  setLang: () => {},
  t: (k) => dict[k]?.sw ?? k,
  locale: "sw-TZ",
});

const STORAGE_KEY = "mumso-lang";

export const localeFor = (lang: Lang) => (lang === "en" ? "en-GB" : "sw-TZ");

/** Tafsiri nje ya React (mf. kwenye hooks zinazotumia callbacks). */
export function translate(lang: Lang, key: string) {
  return dict[key]?.[lang] ?? key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sw");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "sw") setLangState(saved);
    } catch {
      /* Hifadhi inaweza kuwa imezuiwa. */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* Hifadhi inaweza kuwa imezuiwa. */
    }
  }, []);

  const t = useCallback((k: string) => dict[k]?.[lang] ?? k, [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang, t, locale: localeFor(lang) }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useI18n() {
  return useContext(LangCtx);
}
