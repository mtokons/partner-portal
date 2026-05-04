"use server";

import { getSharePointConnectionInfo } from "@/lib/sharepoint";

export async function getConnectionInfoAction() {
  return await getSharePointConnectionInfo();
}
