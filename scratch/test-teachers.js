
const { getSchoolTeachers } = require("../src/lib/firestore-services");

async function test() {
  try {
    console.log("Fetching teachers...");
    const teachers = await getSchoolTeachers();
    console.log(`Found ${teachers.length} teachers.`);
    teachers.forEach((t, i) => {
      console.log(`${i}: ${t.name} (${t.email})`);
      if (!t.name) console.error(`WARNING: Teacher ${t.id} has no name!`);
    });
  } catch (err) {
    console.error("Error fetching teachers:", err);
  }
}

test();
