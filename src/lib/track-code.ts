/** Namba ya kufuatilia — tarakimu sita. */
export function newTrackCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function trackCodeMessage(code: string, intro: string): string {
  return `${intro}\n\nNAMBA YAKO YA KUFUATILIA: ${code}\n\nTunza namba hii. Ukiisahau, weka namba yako ya simu na jina lako la mwisho kwenye ukurasa wa "Fuatilia Ombi".`;
}
