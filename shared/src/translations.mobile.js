/** Chaînes propres à l'application mobile (le reste est partagé avec le web). */
export const MOBILE_TRANSLATIONS = Object.freeze({
  en: Object.freeze({
    rel_now: 'just now', rel_minutes: '{{count}} min ago', rel_hours: '{{count}} h ago', rel_days: '{{count}} d ago',
    mob_webOnlyTitle: 'Use the web workspace', mob_webOnlyText: 'Your role (agency / platform administration) is managed from the web application. The mobile app is for pilgrims and guides.',
    mob_restartRtl: 'Restart the app to apply the right-to-left layout.', mob_loadError: 'Unable to load. Pull down to retry.', mob_hello: 'Assalamu alaykum, {{name}}',
    mob_noCamera: 'Camera scanning will come in a future update: paste the code shown under the pilgrim’s QR Code.', mob_chooseSource: 'Choose how to add this document', mob_takePhoto: 'Take a photo', mob_chooseGallery: 'Choose from gallery', mob_chooseFile: 'Choose a file (PDF)',
    mob_expiryOptional: 'Expiry date (optional)', mob_expiryPlaceholder: 'YYYY-MM-DD', mob_invalidFile: 'Invalid file', mob_invalidDate: 'Enter the date as YYYY-MM-DD.', mob_permissionDenied: 'Permission denied', mob_cameraPermission: 'Camera access is required for this action.', mob_galleryPermission: 'Gallery access is required for this action.',
    mob_attachTitle: 'Attach media', mob_attachChoose: 'Choose a source', mob_gallery: 'Gallery', mob_fileVideo: 'File or video', mob_dateField: 'Date (YYYY-MM-DD)', mob_timeField: 'Time (HH:MM)', mob_courseSaved: 'Course saved.', mob_sendFailed: 'Unable to send.', mob_confirm: 'Are you sure?',
    mob_replace: 'Replace', mob_add: 'Add', mob_signOutConfirm: 'Sign out of this device?', mob_apiHint: 'Server',
  }),
  fr: Object.freeze({
    rel_now: 'à l’instant', rel_minutes: 'il y a {{count}} min', rel_hours: 'il y a {{count}} h', rel_days: 'il y a {{count}} j',
    mob_webOnlyTitle: 'Utilise l’espace web', mob_webOnlyText: 'Ton rôle (agence / administration de la plateforme) se gère depuis l’application web. L’application mobile est destinée aux pèlerins et aux guides.',
    mob_restartRtl: 'Redémarre l’application pour appliquer l’affichage de droite à gauche.', mob_loadError: 'Chargement impossible. Tire vers le bas pour réessayer.', mob_hello: 'Assalamu alaykum, {{name}}',
    mob_noCamera: 'Le scan par caméra arrivera dans une prochaine mise à jour : colle le code affiché sous le QR Code du pèlerin.', mob_chooseSource: 'Choisis comment ajouter ce document', mob_takePhoto: 'Prendre une photo', mob_chooseGallery: 'Choisir depuis la galerie', mob_chooseFile: 'Choisir un fichier (PDF)',
    mob_expiryOptional: 'Date d’expiration (facultative)', mob_expiryPlaceholder: 'AAAA-MM-JJ', mob_invalidFile: 'Fichier invalide', mob_invalidDate: 'Saisis la date au format AAAA-MM-JJ.', mob_permissionDenied: 'Permission refusée', mob_cameraPermission: 'L’accès à l’appareil photo est nécessaire pour cette action.', mob_galleryPermission: 'L’accès à la galerie est nécessaire pour cette action.',
    mob_attachTitle: 'Joindre un média', mob_attachChoose: 'Choisis une source', mob_gallery: 'Galerie', mob_fileVideo: 'Fichier ou vidéo', mob_dateField: 'Date (AAAA-MM-JJ)', mob_timeField: 'Heure (HH:MM)', mob_courseSaved: 'Cours enregistré.', mob_sendFailed: 'Envoi impossible.', mob_confirm: 'Tu confirmes ?',
    mob_replace: 'Remplacer', mob_add: 'Ajouter', mob_signOutConfirm: 'Te déconnecter de cet appareil ?', mob_apiHint: 'Serveur',
  }),
  ar: Object.freeze({
    rel_now: 'الآن', rel_minutes: 'منذ {{count}} دقيقة', rel_hours: 'منذ {{count}} ساعة', rel_days: 'منذ {{count}} يوم',
    mob_webOnlyTitle: 'استخدم مساحة الويب', mob_webOnlyText: 'تتم إدارة دورك (الوكالة / إدارة المنصة) من تطبيق الويب. تطبيق الجوال مخصص للحجاج والمرشدين.',
    mob_restartRtl: 'أعد تشغيل التطبيق لتطبيق اتجاه العرض من اليمين إلى اليسار.', mob_loadError: 'تعذر التحميل. اسحب للأسفل لإعادة المحاولة.', mob_hello: 'السلام عليكم، {{name}}',
    mob_noCamera: 'سيتوفر المسح بالكاميرا في تحديث لاحق: الصق الرمز المعروض تحت رمز QR للحاج.', mob_chooseSource: 'اختر طريقة إضافة هذه الوثيقة', mob_takePhoto: 'التقاط صورة', mob_chooseGallery: 'اختيار من المعرض', mob_chooseFile: 'اختيار ملف (PDF)',
    mob_expiryOptional: 'تاريخ الانتهاء (اختياري)', mob_expiryPlaceholder: 'YYYY-MM-DD', mob_invalidFile: 'ملف غير صالح', mob_invalidDate: 'أدخل التاريخ بصيغة YYYY-MM-DD.', mob_permissionDenied: 'تم رفض الإذن', mob_cameraPermission: 'الوصول إلى الكاميرا مطلوب لهذا الإجراء.', mob_galleryPermission: 'الوصول إلى المعرض مطلوب لهذا الإجراء.',
    mob_attachTitle: 'إرفاق وسائط', mob_attachChoose: 'اختر مصدراً', mob_gallery: 'المعرض', mob_fileVideo: 'ملف أو فيديو', mob_dateField: 'التاريخ (YYYY-MM-DD)', mob_timeField: 'الوقت (HH:MM)', mob_courseSaved: 'تم حفظ الدرس.', mob_sendFailed: 'تعذر الإرسال.', mob_confirm: 'هل أنت متأكد؟',
    mob_replace: 'استبدال', mob_add: 'إضافة', mob_signOutConfirm: 'تسجيل الخروج من هذا الجهاز؟', mob_apiHint: 'الخادم',
  }),
});
