// Datum volgens de klok van het toestel (België), niet in wereldtijd (UTC).
// offsetMinuten = Date.prototype.getTimezoneOffset() (België: -60 in de winter, -120 in de zomer)
export function lokaleDatum(d = new Date(), offsetMinuten = d.getTimezoneOffset()) {
  return new Date(d.getTime() - offsetMinuten * 60000).toISOString().slice(0, 10);
}
