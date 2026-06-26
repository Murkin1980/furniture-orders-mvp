const base = "https://furniture-crm.twenty.com/rest";
const key = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMyOGM2OTdhLWRkYTQtNGM1Ny1iNDYyLThhN2U2OTUyNDUwNSJ9.eyJzdWIiOiJlYjIxODY0OC04ZDFkLTRiOWItYWJlOC01NWEyYjE5ZjQ0YzciLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZWIyMTg2NDgtOGQxZC00YjliLWFiZTgtNTVhMmIxOWY0NGM3IiwiaWF0IjoxNzgyNDQwODA2LCJleHAiOjQ5MzU5NTQzOTcsImp0aSI6IjljNWU3ZTljLTk0ZjctNDMzMi05OTc5LTdmNGUxZDkzZmUxMCJ9.s-dI5xZk0FDQ9ADwhcZfg8PLltiSF6fYXkI2nBkOSxc4tvj1flxA9rNdIAhTXu7qofgIVskPVVWoPZddmzeOYg";

const peopleRes = await fetch(base + "/people", {
  method: "GET", headers: { Authorization: "Bearer " + key }
});
const peopleData = await peopleRes.json();
const existingPerson = peopleData?.data?.people?.[0];
console.log("Existing person:", existingPerson?.id, existingPerson?.name?.firstName, existingPerson?.phones?.primaryPhoneNumber);

// Create person with valid phone
const personBody = { name: { firstName: "Иван", lastName: "Петров" }, phones: { primaryPhoneNumber: "77011234567" } };
const createRes = await fetch(base + "/people", {
  method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
  body: JSON.stringify(personBody)
});
const createData = await createRes.json();
console.log("Create person:", createRes.status, JSON.stringify(createData).slice(0, 200));

if (createRes.ok) {
  const personId = createData.data?.createPerson?.id;
  console.log("Created person ID:", personId);
  
  // Create opportunity linked to person
  const oppBody = { name: "Заказ #12 - kitchen", amount: { amountMicros: 870000000000, currencyCode: "KZT" }, pointOfContactId: personId };
  const oppRes = await fetch(base + "/opportunities", {
    method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(oppBody)
  });
  const oppData = await oppRes.json();
  console.log("Create opportunity:", oppRes.status, JSON.stringify(oppData).slice(0, 200));
  
  if (oppRes.ok) {
    const oppId = oppData.data?.createOpportunity?.id;
    // Create note linked to opportunity
    const noteBody = { title: "Order #12", body: "Furniture order from site" };
    const noteRes = await fetch(base + "/notes", {
      method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(noteBody)
    });
    const noteData = await noteRes.json();
    console.log("Create note:", noteRes.status, JSON.stringify(noteData).slice(0, 200));
  }
}
