// Server-only utility module for Supabase Storage uploads.
// Do NOT add "use client" to this file. It is called only from Server Actions.

if (typeof window !== "undefined") {
  throw new Error("This file can only be executed in a server environment.");
}

/**
 * Uploads a file buffer directly to a Supabase Storage bucket using standard REST API.
 * Uses the non-public SUPABASE_SERVICE_ROLE_KEY to authenticate.
 */
export async function uploadAvatar(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase Storage credentials are missing in the server environment (.env).");
  }

  // Target bucket name: avatars
  const url = `${supabaseUrl}/storage/v1/object/avatars/${fileName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": mimeType,
      "x-upsert": "true", // Overwrite existing files if names match
    },
    body: fileBuffer as any,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase Storage Upload failed: ${errorText}`);
  }

  // Return the public url of the uploaded file
  return `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;
}

/**
 * Removes a file from the Supabase Storage bucket.
 */
export async function deleteAvatar(avatarUrl: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || !avatarUrl) return;

  // Extract the filename from the public Supabase CDN URL
  const pathParts = avatarUrl.split("/avatars/");
  if (pathParts.length < 2) return;
  const fileName = pathParts[1];

  const url = `${supabaseUrl}/storage/v1/object/avatars`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefixes: [fileName],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Supabase Storage deletion failed for file ${fileName}:`, errorText);
  }
}
