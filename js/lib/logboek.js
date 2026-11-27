// Logboek voor de trainer: rijen omzetten naar leesbare zinnen.

export const SOORTEN = {
  alles: null,
  inloggen: ['ingelogd', 'uitgelogd', 'account_aangemaakt', 'speler_gekozen', 'speler_aangemaakt'],
  activiteit: ['schiettraining_gestart', 'schiettraining', 'zelfevaluatie'],
  app: ['app_geinstalleerd'],
  fouten: ['fout'],
};

export function logTekst({ actie, email, speler_naam, details }) {
  const wie = speler_naam || email || 'Iemand';
  switch (actie) {
    case 'ingelogd': return speler_naam ? `${email} heeft zich ingelogd op ${speler_naam}` : `${email} heeft zich ingelogd (nog geen speler gekozen)`;
    case 'uitgelogd': return `${wie} heeft zich uitgelogd`;
    case 'account_aangemaakt': return `${email} heeft een account aangemaakt`;
    case 'speler_gekozen': return `${email} heeft gekozen: ik ben ${details}`;
    case 'speler_aangemaakt': return `${email} heeft zichzelf aangemaakt als speler ${details}`;
    case 'schiettraining_gestart': return `${wie} is een schiettraining gestart`;
    case 'schiettraining': return `${wie} heeft een schiettraining afgesloten (${details} raak)`;
    case 'zelfevaluatie': return `${wie} heeft een zelfevaluatie ingevuld`;
    case 'app_geinstalleerd': return `${wie} heeft de app geïnstalleerd${details ? ` (${details})` : ''}`;
    case 'fout': return `Fout bij ${wie}: ${details}`;
    default: return `${wie}: ${actie}${details ? ` (${details})` : ''}`;
  }
}
