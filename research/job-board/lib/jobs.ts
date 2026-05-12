export async function fetchJobs(page = 1, query = "") {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    q: query,
  });

  const res = await fetch(`/api/jobs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}