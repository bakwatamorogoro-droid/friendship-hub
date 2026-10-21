/** Namba ya kufuatilia — tarakimu sita. */
export function newTrackCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Ujumbe wa namba ya kufuatilia kwa Kiswahili na Kiingereza. */
export function trackCodeMessage(code: string, intro: string, introEn: string): string {
  return [
    intro,
    "",
    `NAMBA YAKO YA KUFUATILIA: ${code}`,
    'Tunza namba hii. Ukiisahau, weka namba yako ya simu na jina lako la mwisho kwenye ukurasa wa "Fuatilia Ombi".',
    "",
    "— — —",
    "",
    introEn,
    "",
    `YOUR TRACKING NUMBER: ${code}`,
    'Keep this number safe. If you forget it, enter your phone number and last name on the "Track Request" page.',
  ].join("\n");
}
