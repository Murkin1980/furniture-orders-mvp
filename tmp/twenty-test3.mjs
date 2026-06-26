import { buildTwentyPersonPayload, buildTwentyOpportunityPayload, buildTwentyNotePayload } from "../src/crm/twenty-mapper.js";

const key = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMyOGM2OTdhLWRkYTQtNGM1Ny1iNDYyLThhN2U2OTUyNDUwNSJ9.eyJzdWIiOiJlYjIxODY0OC04ZDFkLTRiOWItYWJlOC01NWEyYjE5ZjQ0YzciLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZWIyMTg2NDgtOGQxZC00YjliLWFiZTgtNTVhMmIxOWY0NGM3IiwiaWF0IjoxNzgyNDQwODA2LCJleHAiOjQ5MzU5NTQzOTcsImp0aSI6IjljNWU3ZTljLTk0ZjctNDMzMi05OTc5LTdmNGUxZDkzZmUxMCJ9.s-dI5xZk0FDQ9ADwhcZfg8PLltiSF6fYXkI2nBkOSxc4tvj1flxA9rNdIAhTXu7qofgIVskPVVWoPZddmzeOYg";
const base = "https://furniture-crm.twenty.com/rest";
const h = { Authorization: "Bearer " + key, "Content-Type": "application/json" };

const order = { id: 12, name: "Иван Петров", phone: "+77011234567", source: "site", furnitureType: "kitchen", budget: 870000, description: "Тестовый заказ" };

// Test person creation with mapper output
const personPayload = buildTwentyPersonPayload(order);
console.log("Person payload:", JSON.stringify(personPayload, null, 2));
const personRes = await fetch(base + "/people", { method: "POST", headers: h, body: JSON.stringify(personPayload) });
const personData = await personRes.json();
console.log("Create person:", personRes.status, JSON.stringify(personData).slice(0, 300));

if (personRes.ok) {
  const personId = personData.data?.createPerson?.id;
  console.log("Person ID:", personId);

  // Test opportunity creation
  const oppPayload = buildTwentyOpportunityPayload({ ...order, pointOfContactId: personId });
  console.log("Opp payload:", JSON.stringify(oppPayload, null, 2));
  const oppRes = await fetch(base + "/opportunities", { method: "POST", headers: h, body: JSON.stringify(oppPayload) });
  const oppData = await oppRes.json();
  console.log("Create opportunity:", oppRes.status, JSON.stringify(oppData).slice(0, 300));
}
