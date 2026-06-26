const base = "https://furniture-crm.twenty.com/rest";
const key = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMyOGM2OTdhLWRkYTQtNGM1Ny1iNDYyLThhN2U2OTUyNDUwNSJ9.eyJzdWIiOiJlYjIxODY0OC04ZDFkLTRiOWItYWJlOC01NWEyYjE5ZjQ0YzciLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZWIyMTg2NDgtOGQxZC00YjliLWFiZTgtNTVhMmIxOWY0NGM3IiwiaWF0IjoxNzgyNDQwODA2LCJleHAiOjQ5MzU5NTQzOTcsImp0aSI6IjljNWU3ZTljLTk0ZjctNDMzMi05OTc5LTdmNGUxZDkzZmUxMCJ9.s-dI5xZk0FDQ9ADwhcZfg8PLltiSF6fYXkI2nBkOSxc4tvj1flxA9rNdIAhTXu7qofgIVskPVVWoPZddmzeOYg";
const h = { Authorization: "Bearer " + key, "Content-Type": "application/json" };
const body = JSON.stringify({ name: { firstName: "Test", lastName: "User" }, phones: { primaryPhoneNumber: "123456789" } });

for (const path of ["/people", "/person", "/persons", "/objects/person", "/objects/people"]) {
  try {
    const r = await fetch(base + path, { method: "POST", headers: h, body });
    const d = await r.json();
    console.log(r.status, path, d.messages?.[0]?.slice(0, 80) || (d.data ? "OK: created " + JSON.stringify(d.data).slice(0, 60) : JSON.stringify(d).slice(0, 80)));
  } catch (e) { console.log("ERR", path, e.message); }
}
