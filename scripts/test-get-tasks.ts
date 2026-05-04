import { getKanbanTasks } from "../src/lib/sharepoint";
import 'dotenv/config';

async function test() {
  console.log("Testing getKanbanTasks...");
  try {
    const tasks = await getKanbanTasks();
    console.log("Tasks returned:", tasks.length);
    if (tasks.length > 0) {
      console.log("First task title:", tasks[0].title);
      console.log("First task description:", tasks[0].description);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
