"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { enrollStudent, fetchStudentsAction, fetchAvailableBatches } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, User, BookOpen, Calculator, Loader2, Check, UserPlus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";

interface StudentResult {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: string;
  sccgId?: string;
}

interface BatchWithFee {
  id: string;
  batchCode: string;
  batchName: string;
  courseId: string;
  courseName: string;
  courseFee: number;
  teacherName: string;
  startDate: string;
  status: string;
}

export default function NewEnrollmentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>}>
      <EnrollmentForm />
    </Suspense>
  );
}

function EnrollmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for search/selection
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [batches, setBatches] = useState<BatchWithFee[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  const [studentType, setStudentType] = useState<"existing" | "new">("existing");
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithFee | null>(null);
  
  // Form state
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  
  const [totalFee, setTotalFee] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setSearchingStudents(true);
        try {
          const results = await fetchStudentsAction(searchQuery);
          setStudents(results);
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingStudents(false);
        }
      } else {
        setStudents([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      setLoadingBatches(true);
      try {
        const b = await fetchAvailableBatches();
        setBatches(b);
        
        // If batchId is in URL, auto-select
        const urlBatchId = searchParams.get("batchId");
        if (urlBatchId) {
          const found = b.find(x => x.id === urlBatchId);
          if (found) {
            setSelectedBatch(found);
            setTotalFee(String(found.courseFee || ""));
          }
        }
      } catch (err) {
        console.error("Failed to load batches", err);
      } finally {
        setLoadingBatches(false);
      }
    }
    loadInitialData();
  }, [searchParams]);

  // Handle batch selection - auto fill fee
  useEffect(() => {
    if (selectedBatch) {
      setTotalFee(String(selectedBatch.courseFee || "5000"));
    }
  }, [selectedBatch]);

  const netFee = Math.max(0, (parseFloat(totalFee) || 0) - (parseFloat(discountAmount) || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (studentType === "existing" && !selectedStudent) {
      setError("Please select a student");
      return;
    }
    if (studentType === "new" && (!newStudentName || !newStudentEmail)) {
      setError("Please fill in new student name and email");
      return;
    }
    if (!selectedBatch) {
      setError("Please select a batch");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isExisting = studentType === "existing" && selectedStudent;
      await enrollStudent({
        isNewStudent: studentType === "new",
        studentUserId: isExisting ? selectedStudent.id : undefined,
        studentName: isExisting ? (selectedStudent.name || selectedStudent.fullName || "") : newStudentName,
        studentEmail: isExisting ? selectedStudent.email : newStudentEmail,
        studentPhone: isExisting ? selectedStudent.phone : newStudentPhone,
        batchId: selectedBatch.id,
        batchCode: selectedBatch.batchCode,
        courseId: selectedBatch.courseId,
        courseName: selectedBatch.courseName,
        totalFee: parseFloat(totalFee) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        discountReason: discountReason || undefined,
      });
      router.push("/admin/school/enrollments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 pb-20 px-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground tracking-tight">Quick Enrollment</h1>
           <p className="text-muted-foreground text-sm mt-1">Add existing students or register new ones with automatic ID generation.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <Info className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Student Selection */}
          <div className="lg:col-span-2 space-y-8">
            
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-8 py-5">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-gray-800">
                  <User className="h-5 w-5 text-primary" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <Tabs value={studentType} onValueChange={(v) => setStudentType(v as "existing" | "new")} className="w-full">
                <div className="px-8 pt-6">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-gray-100/50 h-12">
                    <TabsTrigger value="existing" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">
                      Existing Student
                    </TabsTrigger>
                    <TabsTrigger value="new" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">
                      New Registration
                    </TabsTrigger>
                  </TabsList>
                </div>

                <CardContent className="p-8">
                  <TabsContent value="existing" className="mt-0 space-y-4">
                    {!selectedStudent ? (
                      <div className="space-y-4">
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                          <Input 
                            placeholder="Find by name, email or SCCG ID..." 
                            className="pl-12 h-14 rounded-2xl border-gray-200 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {searchingStudents ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                              <p className="text-xs font-medium text-gray-400">Searching directory...</p>
                            </div>
                          ) : students.length > 0 ? (
                            students.map((s) => (
                              <div 
                                key={s.id}
                                onClick={() => setSelectedStudent(s)}
                                className="flex items-center justify-between p-4 rounded-[22px] border border-gray-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group animate-in slide-in-from-bottom-2"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                    {(s.name || s.fullName || "U").slice(0, 1)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{s.name || s.fullName}</p>
                                    <p className="text-xs font-medium text-gray-500">{s.email}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="rounded-xl py-1 px-3 bg-white group-hover:bg-primary group-hover:text-white transition-all">Select</Badge>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                               <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <Search className="h-6 w-6 text-gray-300" />
                               </div>
                               <p className="text-sm font-medium text-gray-400">Search for an existing student account</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-6 rounded-[28px] bg-primary/5 border-2 border-primary/10 animate-in zoom-in-95">
                        <div className="flex items-center gap-5">
                          <div className="h-16 w-16 rounded-[20px] bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
                            {(selectedStudent.name || selectedStudent.fullName || "U").slice(0, 1)}
                          </div>
                          <div>
                            <p className="font-black text-xl text-primary">{selectedStudent.name || selectedStudent.fullName}</p>
                            <p className="text-sm font-semibold text-gray-500 italic mb-2">{selectedStudent.email}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] uppercase font-black bg-white">{selectedStudent.role}</Badge>
                              {selectedStudent.sccgId && <span className="text-[10px] font-mono font-bold text-primary/60">{selectedStudent.sccgId}</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="secondary" className="rounded-xl font-bold" onClick={() => setSelectedStudent(null)}>Change Student</Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="new" className="mt-0 space-y-6">
                    <div className="p-6 rounded-[28px] bg-amber-50/50 border border-amber-100 mb-2 flex items-start gap-4">
                       <div className="mt-1 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                         <UserPlus className="h-4 w-4 text-amber-600" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-bold text-amber-900">New Student Account</p>
                         <p className="text-xs text-amber-700 leading-relaxed font-medium">A portal account will be created automatically with a unique SCCG ID upon confirmation.</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="newName" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Full Name *</Label>
                        <Input 
                          id="newName" 
                          placeholder="Legal Student Name"
                          className="h-14 rounded-2xl border-gray-200 focus:ring-4 focus:ring-primary/5 transition-all"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newEmail" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Email Address *</Label>
                        <Input 
                          id="newEmail" 
                          type="email"
                          placeholder="student@example.com"
                          className="h-14 rounded-2xl border-gray-200 focus:ring-4 focus:ring-primary/5 transition-all"
                          value={newStudentEmail}
                          onChange={(e) => setNewStudentEmail(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="newPhone" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Phone Number</Label>
                        <Input 
                          id="newPhone" 
                          placeholder="+880..."
                          className="h-14 rounded-2xl border-gray-200 focus:ring-4 focus:ring-primary/5 transition-all"
                          value={newStudentPhone}
                          onChange={(e) => setNewStudentPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* Batch Selector */}
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-8 py-5">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-gray-800">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Select Class Batch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-3">
                  {loadingBatches ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                    </div>
                  ) : batches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {batches.map((b) => (
                        <div 
                          key={b.id}
                          onClick={() => setSelectedBatch(b)}
                          className={`p-5 rounded-[24px] border-2 transition-all cursor-pointer group ${
                            selectedBatch?.id === b.id 
                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" 
                            : "bg-white border-gray-100 hover:border-primary/30 text-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant={selectedBatch?.id === b.id ? "secondary" : "default"} className={`font-mono text-[10px] rounded-lg ${selectedBatch?.id === b.id ? "bg-white text-primary" : ""}`}>
                              {b.batchCode}
                            </Badge>
                          </div>
                          <p className="font-black truncate text-base">{b.batchName}</p>
                          <p className={`text-xs mt-2 font-bold flex items-center gap-2 ${selectedBatch?.id === b.id ? "text-white/80" : "text-gray-400"}`}>
                            {b.teacherName}
                          </p>
                          <div className={`mt-4 pt-4 border-t flex justify-between items-center ${selectedBatch?.id === b.id ? "border-white/20" : "border-gray-50"}`}>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Starts: {new Date(b.startDate).toLocaleDateString()}</p>
                             <p className="font-black text-sm">৳ {b.courseFee?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No active batches found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Fees & Summary */}
          <div className="space-y-8">
            <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20 sticky top-8">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-8 py-5">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-gray-800">
                  <Calculator className="h-5 w-5 text-primary" />
                  Fees Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="totalFee" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Base Course Fee</Label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">৳</span>
                      <Input 
                        id="totalFee"
                        type="number"
                        placeholder="0.00"
                        className="pl-10 h-14 rounded-2xl border-gray-200 font-black text-xl bg-gray-50/50 focus:bg-white transition-all shadow-inner border-0 ring-1 ring-gray-100 focus:ring-4 focus:ring-primary/5"
                        value={totalFee}
                        onChange={(e) => setTotalFee(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountAmount" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Applied Discount</Label>
                    <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">৳</span>
                       <Input 
                        id="discountAmount"
                        type="number"
                        className="pl-10 h-14 rounded-2xl border-gray-200 font-black text-xl bg-gray-50/50 focus:bg-white transition-all shadow-inner border-0 ring-1 ring-gray-100 focus:ring-4 focus:ring-primary/5"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {parseFloat(discountAmount) > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-top-1">
                      <Label htmlFor="discountReason" className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Reason for Discount</Label>
                      <Input 
                        id="discountReason"
                        placeholder="Merit / Early Bird..."
                        className="h-12 rounded-2xl border-gray-200 bg-white shadow-sm"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-200 pt-6 mt-8">
                   <div className="flex justify-between items-end mb-8">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Net Enrollment Fee</p>
                      <div className="text-right">
                         <p className="text-4xl font-black text-primary drop-shadow-sm">
                            ৳ {netFee.toLocaleString()}
                         </p>
                      </div>
                   </div>

                    <Button 
                    type="submit" 
                    className="w-full rounded-[24px] h-16 font-black text-lg shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 group"
                    disabled={loading || !selectedBatch || !totalFee || (studentType === "existing" && !selectedStudent) || (studentType === "new" && (!newStudentName || !newStudentEmail))}
                   >
                     {loading ? (
                       <Loader2 className="h-6 w-6 animate-spin" />
                     ) : (
                       <>
                         Confirm Enrollment
                         <Check className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                       </>
                     )}
                   </Button>
                   
                   {/* Validation Helper */}
                   {!selectedBatch && <p className="text-[10px] text-center text-rose-500 font-bold mt-3 animate-pulse">Select a batch to continue</p>}
                   {selectedBatch && studentType === "existing" && !selectedStudent && <p className="text-[10px] text-center text-rose-500 font-bold mt-3 animate-pulse">Search and select a student</p>}
                   {selectedBatch && studentType === "new" && (!newStudentName || !newStudentEmail) && <p className="text-[10px] text-center text-rose-500 font-bold mt-3 animate-pulse">Enter name and email for new student</p>}
                   <p className="text-[10px] text-center text-gray-400 mt-6 px-4 italic font-medium leading-relaxed">
                     By confirming, a profile and ID will be generated for new students, and installments will be set if {">= "} ৳ 10,000.
                   </p>
                </div>
              </CardContent>
            </Card>

            {/* Selection Context */}
            {selectedBatch && (
               <div className="p-6 rounded-[28px] bg-white shadow-xl border border-gray-100 flex items-center gap-4 animate-in slide-in-from-right-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-primary font-black shadow-inner">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Enrolling into</p>
                    <p className="font-black text-gray-800">{selectedBatch.courseName}</p>
                    <p className="text-xs font-bold text-primary">{selectedBatch.batchCode}</p>
                  </div>
               </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
