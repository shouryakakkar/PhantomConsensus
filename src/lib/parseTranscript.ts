export function extractSpeakers(transcript: string): string[] {
  const speakers = new Set<string>();
  
  // Format 1: "Alice:" or "Alice (10:00AM):" at start of line
  const regex1 = /^([A-Z][A-Za-z0-9\s.-]+?)\s*(?:\([^)]+\))?\s*:/gm;
  let match;
  while ((match = regex1.exec(transcript)) !== null) {
    const name = match[1].trim();
    if (name.length > 1 && name !== "NOTE" && name !== "WEBVTT") {
      speakers.add(name);
    }
  }

  // Format 2: WEBVTT format "<v Alice Smith>"
  const regex2 = /<v\s+([^>]+)>/gm;
  while ((match = regex2.exec(transcript)) !== null) {
    speakers.add(match[1].trim());
  }

  return Array.from(speakers);
}
