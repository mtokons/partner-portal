import { getGraphClient } from "../src/lib/graph";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

async function checkStorage() {
  try {
    const client = await getGraphClient();
    const drive = await client.api("/me/drive").get();
    console.log("OneDrive Storage Status:");
    console.log(JSON.stringify(drive.quota, null, 2));
    
    // Also check default site drive
    const siteId = process.env.SHAREPOINT_SITE_ID;
    if (siteId) {
      const siteDrive = await client.api(`/sites/${siteId}/drive`).get();
      console.log("\nSharePoint Site Drive Storage Status:");
      console.log(JSON.stringify(siteDrive.quota, null, 2));
    }
  } catch (err: any) {
    console.error("Error fetching storage status:", err.message || err);
  }
}

checkStorage();
