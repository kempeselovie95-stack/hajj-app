/** Chaînes liées aux tâches propres à chaque rôle (guides gérés par l'agence, « Mon dossier » du pèlerin). */
export const ROLES_TRANSLATIONS = Object.freeze({
  en: Object.freeze({
    en_loadError: 'Unable to load guides.', en_created: 'Guide account created.', en_createError: 'Unable to create the guide.', en_deleteError: 'Unable to delete the guide.', en_new: '+ New guide',
    md_open: 'Open my application →', md_title: 'My application', md_loadError: 'Unable to load your application.', md_noDossier: 'No application yet. Your agency will create it for you.',
    md_badType: 'Unsupported file. Use a JPG, PNG or PDF.', md_tooBig: 'File too large (5 MB maximum).', md_uploaded: 'Document sent. Your agency will review it.', md_uploadError: 'Unable to send the document.',
    md_submitted: 'Application submitted. Your agency will review it.', md_missingDocs: 'Some required documents are missing.', md_submitError: 'Unable to submit your application.',
    md_documents: 'Required documents', md_progress: '{{approved}}/{{total}} approved', md_replace: 'Replace', md_upload: 'Upload', md_fileHint: 'Accepted formats: JPG, PNG, PDF · 5 MB maximum per file.',
    md_missingCount_one: '{{count}} required document still to send.', md_missingCount_other: '{{count}} required documents still to send.', md_readyToSubmit: 'All documents sent: you can submit your application.', md_submit: 'Submit my application',
    md_payments: 'My payments', md_total: 'Package price', md_paid: 'Paid', md_pending: 'Awaiting approval', md_remaining: 'Remaining balance', md_paidShare: 'Paid', md_noPayments: 'No payments recorded yet.',
    md_paymentHint: 'Payments are recorded by your agency and appear here once approved.',
  }),
  fr: Object.freeze({
    en_loadError: 'Impossible de charger les guides.', en_created: 'Compte guide créé.', en_createError: 'Impossible de créer le guide.', en_deleteError: 'Impossible de supprimer le guide.', en_new: '+ Nouveau guide',
    md_open: 'Ouvrir mon dossier →', md_title: 'Mon dossier', md_loadError: 'Impossible de charger ton dossier.', md_noDossier: 'Aucun dossier pour le moment. Ton agence va le créer pour toi.',
    md_badType: 'Fichier non pris en charge. Utilise un JPG, PNG ou PDF.', md_tooBig: 'Fichier trop volumineux (5 Mo maximum).', md_uploaded: 'Document envoyé. Ton agence va le vérifier.', md_uploadError: 'Impossible d’envoyer le document.',
    md_submitted: 'Dossier soumis. Ton agence va l’examiner.', md_missingDocs: 'Des documents obligatoires manquent.', md_submitError: 'Impossible de soumettre ton dossier.',
    md_documents: 'Documents obligatoires', md_progress: '{{approved}}/{{total}} validés', md_replace: 'Remplacer', md_upload: 'Téléverser', md_fileHint: 'Formats acceptés : JPG, PNG, PDF · 5 Mo maximum par fichier.',
    md_missingCount_one: '{{count}} document obligatoire reste à envoyer.', md_missingCount_other: '{{count}} documents obligatoires restent à envoyer.', md_readyToSubmit: 'Tous les documents sont envoyés : tu peux soumettre ton dossier.', md_submit: 'Soumettre mon dossier',
    md_payments: 'Mes paiements', md_total: 'Prix du forfait', md_paid: 'Payé', md_pending: 'En attente de validation', md_remaining: 'Solde restant', md_paidShare: 'Payé', md_noPayments: 'Aucun paiement enregistré pour le moment.',
    md_paymentHint: 'Les paiements sont enregistrés par ton agence et apparaissent ici une fois validés.',
  }),
  ar: Object.freeze({
    en_loadError: 'تعذر تحميل المرشدين.', en_created: 'تم إنشاء حساب المرشد.', en_createError: 'تعذر إنشاء المرشد.', en_deleteError: 'تعذر حذف المرشد.', en_new: '+ مرشد جديد',
    md_open: 'فتح ملفي ←', md_title: 'ملفي', md_loadError: 'تعذر تحميل ملفك.', md_noDossier: 'لا يوجد ملف بعد. ستنشئه وكالتك لك.',
    md_badType: 'ملف غير مدعوم. استخدم JPG أو PNG أو PDF.', md_tooBig: 'الملف كبير جداً (5 م.ب كحد أقصى).', md_uploaded: 'تم إرسال الوثيقة. ستراجعها وكالتك.', md_uploadError: 'تعذر إرسال الوثيقة.',
    md_submitted: 'تم تقديم الملف. ستراجعه وكالتك.', md_missingDocs: 'بعض الوثائق المطلوبة ناقصة.', md_submitError: 'تعذر تقديم ملفك.',
    md_documents: 'الوثائق المطلوبة', md_progress: '{{approved}}/{{total}} معتمدة', md_replace: 'استبدال', md_upload: 'رفع', md_fileHint: 'الصيغ المقبولة: JPG وPNG وPDF · 5 م.ب كحد أقصى للملف.',
    md_missingCount_one: 'بقيت وثيقة مطلوبة واحدة للإرسال.', md_missingCount_other: 'بقيت {{count}} وثائق مطلوبة للإرسال.', md_readyToSubmit: 'تم إرسال كل الوثائق: يمكنك تقديم ملفك.', md_submit: 'تقديم ملفي',
    md_payments: 'مدفوعاتي', md_total: 'سعر الباقة', md_paid: 'المدفوع', md_pending: 'بانتظار الاعتماد', md_remaining: 'الرصيد المتبقي', md_paidShare: 'المدفوع', md_noPayments: 'لا توجد مدفوعات مسجلة بعد.',
    md_paymentHint: 'تسجّل وكالتك المدفوعات وتظهر هنا بعد اعتمادها.',
  }),
});
