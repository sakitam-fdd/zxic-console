import { toast } from "sonner";
import { resultSucceeded } from "@/lib/utils";

export async function submitDevice(
  request: Promise<Record<string, string>>,
  successMessage: string,
) {
  const result = await request;
  if (!resultSucceeded(result)) {
    throw new Error("设备没有接受此次操作");
  }
  toast.success(successMessage);
  return result;
}
