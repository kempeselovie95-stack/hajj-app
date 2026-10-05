/**
 * Assistant IA (DÉMO) : réponses simulées par mots-clés, sans appel à un vrai modèle.
 * Partagé entre le web et le mobile ; à remplacer plus tard par un appel serveur (LLM).
 */
const KB = {
  fr: {
    title: 'Assistant HajjFlow', demo: 'DÉMO', placeholder: 'Pose ta question…', send: 'Envoyer', thinking: 'écrit…',
    welcome: 'Salam ! Je suis l’assistant HajjFlow (démo). Je peux t’aider sur les documents, les paiements, la santé, les rites et ton voyage.',
    fallback: 'Je suis une démo et je ne connais pas encore la réponse. Essaie : documents, paiement, vaccin, Tawaf, hôtel, groupe… ou contacte ton guide.',
    suggestions: ['Quels documents fournir ?', 'Comment payer mon forfait ?', 'Quels vaccins ?', 'Étapes du Hajj'],
    intents: [
      { k: ['bonjour', 'salut', 'salam', 'assalam', 'hello'], a: 'Wa alaykum salam ! Comment puis-je t’aider pour ton Hajj ?' },
      { k: ['document', 'pièce', 'passeport', 'photo', 'dossier'], a: 'Pièces requises : passeport (valide 6 mois), photo d’identité, certificat médical, certificat de vaccination et preuve de paiement. Dépose-les dans l’onglet Dossier ; ton agence les valide ensuite.' },
      { k: ['payer', 'paiement', 'forfait', 'prix', 'argent', 'solde'], a: 'Choisis ton forfait dans Dossier, paie auprès de ton agence (Mobile Money, virement, espèces…), puis utilise « Déclarer un paiement ». L’agence le valide et ton solde se met à jour.' },
      { k: ['vaccin', 'santé', 'malade', 'méningite', 'médical'], a: 'Le vaccin contre la méningite ACWY est obligatoire. Fais un bilan médical, emporte tes médicaments avec ordonnance et bois beaucoup d’eau.' },
      { k: ['tawaf', 'saï', 'sai', 'ihram', 'arafat', 'mina', 'rite', 'étape', 'hajj'], a: 'Étapes principales : Ihram, Tawaf, Sa’i, Mina (8), Arafat (9), Muzdalifah, lapidation, sacrifice, Tawaf al-Ifada. Retrouve le détail dans l’onglet Cours.' },
      { k: ['hôtel', 'hotel', 'logement', 'chambre'], a: 'Ouvre Plus → Carte → « Hôtels à proximité » pour trouver les hôtels autour de toi, triés par distance.' },
      { k: ['groupe', 'guide', 'encadreur', 'message', 'discussion'], a: 'Ton groupe est dans Plus → Mon groupe : tu peux y écrire à ton guide et aux autres pèlerins, avec photos et vidéos.' },
      { k: ['cours', 'lire', 'audio', 'télécharger'], a: 'Les cours sont dans l’onglet Cours : tu peux les lire, les écouter, les mettre en favoris et les télécharger.' },
      { k: ['vol', 'avion', 'départ', 'aéroport', 'voyage'], a: 'Les détails de ton vol et de ton hôtel sont dans Plus → Mon voyage. Arrive 3 h avant le décollage avec ton QR Code.' },
      { k: ['merci', 'thanks', 'shukran'], a: 'Avec plaisir ! Qu’Allah facilite ton voyage 🤲' },
    ],
  },
  en: {
    title: 'HajjFlow Assistant', demo: 'DEMO', placeholder: 'Ask a question…', send: 'Send', thinking: 'typing…',
    welcome: 'Salam! I’m the HajjFlow assistant (demo). I can help with documents, payments, health, rituals and your trip.',
    fallback: 'I’m a demo and don’t know that yet. Try: documents, payment, vaccine, Tawaf, hotel, group… or contact your guide.',
    suggestions: ['Which documents do I need?', 'How do I pay my package?', 'Which vaccines?', 'Steps of Hajj'],
    intents: [
      { k: ['hello', 'hi ', 'salam', 'assalam', 'hey'], a: 'Wa alaykum salam! How can I help with your Hajj?' },
      { k: ['document', 'passport', 'photo', 'application', 'file'], a: 'Required: passport (valid 6 months), ID photo, medical certificate, vaccination certificate and proof of payment. Upload them in the Application tab; your agency then validates them.' },
      { k: ['pay', 'payment', 'package', 'price', 'money', 'balance'], a: 'Pick your package in Application, pay your agency (Mobile Money, transfer, cash…), then use “Declare a payment”. The agency validates it and your balance updates.' },
      { k: ['vaccine', 'health', 'sick', 'meningitis', 'medical'], a: 'The meningitis ACWY vaccine is mandatory. Get a check-up, bring your prescribed medicines and drink plenty of water.' },
      { k: ['tawaf', 'sa\'i', 'sai', 'ihram', 'arafat', 'mina', 'ritual', 'steps', 'hajj'], a: 'Main steps: Ihram, Tawaf, Sa’i, Mina (8th), Arafat (9th), Muzdalifah, stoning, sacrifice, Tawaf al-Ifada. Details are in the Courses tab.' },
      { k: ['hotel', 'accommodation', 'room'], a: 'Open More → Map → “Hotels nearby” to find hotels around you, sorted by distance.' },
      { k: ['group', 'guide', 'message', 'chat'], a: 'Your group is in More → My group: write to your guide and other pilgrims, with photos and videos.' },
      { k: ['course', 'read', 'audio', 'download'], a: 'Courses are in the Courses tab: read, listen, favourite and download them.' },
      { k: ['flight', 'plane', 'departure', 'airport', 'trip'], a: 'Your flight and hotel details are in More → My trip. Arrive 3 h before departure with your QR Code.' },
      { k: ['thank', 'shukran'], a: 'You’re welcome! May Allah make your journey easy 🤲' },
    ],
  },
  ar: {
    title: 'مساعد HajjFlow', demo: 'تجريبي', placeholder: 'اطرح سؤالك…', send: 'إرسال', thinking: 'يكتب…',
    welcome: 'السلام عليكم! أنا مساعد HajjFlow (نسخة تجريبية). أساعدك في الوثائق والمدفوعات والصحة والمناسك والرحلة.',
    fallback: 'أنا نسخة تجريبية ولا أعرف الإجابة بعد. جرّب: الوثائق، الدفع، التطعيم، الطواف، الفندق، المجموعة… أو تواصل مع مرشدك.',
    suggestions: ['ما الوثائق المطلوبة؟', 'كيف أدفع؟', 'ما التطعيمات؟', 'مراحل الحج'],
    intents: [
      { k: ['السلام', 'مرحبا', 'اهلا'], a: 'وعليكم السلام! كيف أساعدك في رحلة الحج؟' },
      { k: ['وثائق', 'وثيقة', 'جواز', 'صورة', 'ملف'], a: 'المطلوب: جواز سفر (صالح 6 أشهر)، صورة شخصية، شهادة طبية، شهادة تطعيم وإثبات الدفع. ارفعها من تبويب الملف وستتحقق منها وكالتك.' },
      { k: ['دفع', 'سداد', 'باقة', 'سعر', 'مبلغ', 'رصيد'], a: 'اختر باقتك في الملف، ادفع لوكالتك ثم استخدم «التصريح بدفعة». تتحقق الوكالة وتتحدث الأرصدة.' },
      { k: ['تطعيم', 'لقاح', 'صحة', 'مرض', 'طبي'], a: 'لقاح التهاب السحايا ACWY إلزامي. قم بفحص طبي واحمل أدويتك واشرب الكثير من الماء.' },
      { k: ['طواف', 'سعي', 'احرام', 'إحرام', 'عرفة', 'منى', 'مناسك', 'حج'], a: 'المراحل: الإحرام، الطواف، السعي، منى، عرفة، مزدلفة، رمي الجمرات، النحر، طواف الإفاضة. التفاصيل في تبويب الدروس.' },
      { k: ['فندق', 'سكن', 'غرفة'], a: 'افتح المزيد ← الخريطة ← «فنادق قريبة» للعثور على الفنادق حولك مرتبة حسب المسافة.' },
      { k: ['مجموعة', 'مرشد', 'رسالة', 'دردشة'], a: 'مجموعتك في المزيد ← مجموعتي: راسل مرشدك والحجاج الآخرين بالصور والفيديو.' },
      { k: ['درس', 'دروس', 'قراءة', 'صوت', 'تحميل'], a: 'الدروس في تبويب الدروس: اقرأها أو استمع إليها وأضفها للمفضلة وحمّلها.' },
      { k: ['رحلة', 'طيران', 'مطار', 'سفر'], a: 'تفاصيل رحلتك وفندقك في المزيد ← رحلتي. احضر قبل 3 ساعات مع رمز QR.' },
      { k: ['شكرا', 'شكراً'], a: 'عفواً! يسّر الله رحلتك 🤲' },
    ],
  },
};

export function assistantStrings(language) { return KB[language] ?? KB.fr; }

/** Réponse simulée à un message de l'utilisateur. */
export function assistantReply(language, text) {
  const kb = assistantStrings(language);
  const input = ` ${String(text || '').toLowerCase()} `;
  const intent = kb.intents.find((entry) => entry.k.some((keyword) => input.includes(keyword)));
  return intent ? intent.a : kb.fallback;
}
