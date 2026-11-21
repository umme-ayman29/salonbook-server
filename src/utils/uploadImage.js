export async function uploadToImgBB(buffer) {
  const form = new FormData();
  form.append('image', buffer.toString('base64'));

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    { method: 'POST', body: form }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error('Image upload failed');
  }
  return data.data.url;
}