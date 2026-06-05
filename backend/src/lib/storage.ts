import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "tchin-files";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase storage environment variables are missing");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

function cleanFileName(fileName: string) {
  return fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");
}

export async function uploadPdfToStorage(
  file: Express.Multer.File,
  folder: string
) {
  const fileName = cleanFileName(file.originalname);
  const storagePath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return storagePath;
}

export async function createSignedPdfUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}