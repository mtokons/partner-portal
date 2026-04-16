"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeacher, updateTeacher } from "@/app/(portal)/admin/school/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SchoolTeacher } from "@/types";

interface TeacherFormProps {
  initialData?: SchoolTeacher;
  onSuccess?: () => void;
}

export function TeacherForm({ initialData, onSuccess }: TeacherFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      specialization: form.get("specialization") as string,
      language: form.get("language") as string,
      bio: form.get("bio") as string,
    };

    try {
      if (isEdit && initialData) {
        await updateTeacher(initialData.id, data);
      } else {
        await createTeacher(data);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/school/teachers");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save teacher");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20 font-medium">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-bold">Full Name *</Label>
          <Input id="name" name="name" required defaultValue={initialData?.name} placeholder="Prof. Alexander Müller" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="font-bold">Email Address *</Label>
          <Input id="email" name="email" type="email" required defaultValue={initialData?.email} placeholder="alexander@sccg.com" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="font-bold">Phone Number</Label>
          <Input id="phone" name="phone" defaultValue={initialData?.phone} placeholder="+880..." className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization" className="font-bold">Specialization</Label>
          <Input id="specialization" name="specialization" defaultValue={initialData?.specialization} placeholder="DAF (Deutsch als Fremdsprache)" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language" className="font-bold">Primary Language</Label>
          <Select name="language" defaultValue={initialData?.language || "german"}>
            <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="german">German</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="japanese">Japanese</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="bio" className="font-bold">Brief Bio</Label>
          <Textarea id="bio" name="bio" rows={3} defaultValue={initialData?.bio} placeholder="Expert in B1/B2 Goethe preparation..." className="rounded-xl" />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button 
          type="submit" 
          disabled={loading} 
          className="rounded-[18px] h-12 px-8 font-black text-base shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isEdit ? (
            "Update Teacher"
          ) : (
            "Add Teacher"
          )}
        </Button>
      </div>
    </form>
  );
}
