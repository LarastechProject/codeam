import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const levels = [
  ["primary-1-2", "Primary 1–2"],
  ["primary-3-4", "Primary 3–4"],
  ["primary-5-6", "Primary 5–6"],
  ["jss1-plus", "JSS1+"]
] as const;

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const utils = trpc.useUtils();
  const classrooms = trpc.classroom.mine.useQuery(undefined, { enabled: isTeacher });
  const memberships = trpc.classroom.studentMine.useQuery(undefined, { enabled: Boolean(user) && !isTeacher });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState("primary-5-6");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState<number | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("My first project");
  const [html, setHtml] = useState("<h1>Hello CodeSprout</h1>");
  const [css, setCss] = useState("h1 { color: royalblue; }");
  const [javascript, setJavascript] = useState("console.log('Ready to learn');");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());

  const assignmentList = trpc.assignment.mine.useQuery(
    { classroomId: selectedClassroom ?? undefined },
    { enabled: isTeacher && Boolean(selectedClassroom) }
  );
  const progress = trpc.progress.assignment.useQuery(
    { assignmentId: selectedAssignment ?? 0 },
    { enabled: isTeacher && Boolean(selectedAssignment) }
  );
  const teacherNotifications = trpc.notification.mine.useQuery(undefined, { enabled: isTeacher });
  const studentProjects = trpc.project.mine.useQuery(
    { classroomId: selectedClassroom ?? undefined },
    { enabled: Boolean(user) && !isTeacher && Boolean(selectedClassroom) }
  );
  const studentAssignments = trpc.assignment.forStudent.useQuery(
    { classroomId: selectedClassroom ?? 0 },
    { enabled: Boolean(user) && !isTeacher && Boolean(selectedClassroom) }
  );

  const createClassroom = trpc.classroom.create.useMutation({
    onSuccess: async (created) => { toast.success(`Class created. Join code: ${created?.joinCode}`); setClassName(""); await utils.classroom.mine.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createAssignment = trpc.assignment.create.useMutation({
    onSuccess: async () => { toast.success("Assignment created"); setAssignmentTitle(""); setAssignmentInstructions(""); setAssignmentDueAt(""); await assignmentList.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateAssignment = trpc.assignment.update.useMutation({ onSuccess: async () => { toast.success("Assignment updated"); await assignmentList.refetch(); }, onError: (e) => toast.error(e.message) });
  const markNotificationRead = trpc.notification.markRead.useMutation({ onSuccess: async () => { await teacherNotifications.refetch(); }, onError: (e) => toast.error(e.message) });
  const joinClass = trpc.classroom.joinByCode.useMutation({
    onSuccess: async (joined) => { toast.success(`Joined ${joined?.name}`); setJoinCode(""); await utils.classroom.studentMine.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const saveProject = trpc.project.save.useMutation({
    onSuccess: async (saved) => { setProjectId(saved?.id); toast.success("Draft saved to the classroom workspace"); await studentProjects.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const submitProject = trpc.project.submit.useMutation({
    onSuccess: (result) => { toast.success(result.duplicate ? "Submission already recorded; no duplicate was created" : "Immutable submission recorded"); if (!result.duplicate) setSubmissionKey(crypto.randomUUID()); },
    onError: (e) => toast.error(e.message),
  });

  const selectedAssignmentRecord = useMemo(() => assignmentList.data?.find((a) => a.id === selectedAssignment), [assignmentList.data, selectedAssignment]);

  if (loading) return <div className="min-h-screen bg-[#071A52] p-10 text-white">Loading classroom workspace…</div>;
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#071A52] text-white grid place-items-center p-6">
      <div className="w-full max-w-2xl border border-cyan-300/40 bg-[#0B2770] p-10 shadow-2xl">
        <p className="font-mono text-cyan-200 text-sm tracking-[0.25em]">CODESPROUT / CLASSROOM OS</p>
        <h1 className="mt-5 text-5xl font-bold tracking-tight">Build. Run. Learn.</h1>
        <p className="mt-5 max-w-xl text-blue-100 leading-7">A secure workspace where teachers manage assignments and students create, save, and submit HTML, CSS, and JavaScript projects.</p>
        <form className="mt-8 grid gap-3 max-w-md" onSubmit={async (event) => { event.preventDefault(); setAuthBusy(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) toast.error(error.message); setAuthBusy(false); }}>
          <Label className="text-blue-100">Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="border-cyan-200/30 bg-[#071A52] text-white" placeholder="you@example.com" />
          <Label className="text-blue-100">Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="border-cyan-200/30 bg-[#071A52] text-white" placeholder="Your password" />
          <Button type="submit" disabled={authBusy} className="mt-2 bg-cyan-300 text-[#071A52] hover:bg-cyan-200">{authBusy ? "Signing in…" : "Sign in to continue"}</Button>
        </form>
        <p className="mt-4 text-xs text-blue-200">Teacher and student roles are assigned in the classroom database after Supabase identity sync.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#071A52] text-white">
      <header className="border-b border-cyan-200/20 bg-[#081E5D] px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-6">
          <div><p className="font-mono text-xs tracking-[0.25em] text-cyan-200">CODESPROUT / SECURE CLASSROOM WORKSPACE</p><h1 className="mt-2 text-3xl font-bold">{isTeacher ? "Teacher control room" : "Student learning bay"}</h1><p className="mt-1 text-sm text-blue-200">Signed in as {user?.name || user?.email || "CodeSprout user"}</p></div>
          <Button variant="outline" className="border-cyan-200/40 bg-transparent text-white hover:bg-cyan-200/10" onClick={() => logout()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="pointer-events-none fixed inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#9BE7FF 1px, transparent 1px), linear-gradient(90deg, #9BE7FF 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {isTeacher ? (
          <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="border border-cyan-200/30 bg-[#0B2770]/90 p-6">
              <p className="font-mono text-xs tracking-widest text-cyan-200">01 / CLASS INVENTORY</p><h2 className="mt-2 text-2xl font-semibold">Create a classroom</h2>
              <div className="mt-5 space-y-4"><div><Label className="text-blue-100">Class name</Label><Input value={className} onChange={(e) => setClassName(e.target.value)} className="mt-1 border-cyan-200/30 bg-[#071A52] text-white" placeholder="Web Foundations — Term 1" /></div><div><Label className="text-blue-100">Curriculum level</Label><select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="mt-1 h-10 w-full border border-cyan-200/30 bg-[#071A52] px-3 text-sm text-white">{levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><Button className="bg-cyan-300 text-[#071A52] hover:bg-cyan-200" disabled={createClassroom.isPending || !className.trim()} onClick={() => createClassroom.mutate({ name: className, level: classLevel as typeof levels[number][0] })}>Generate join code</Button></div>
              <div className="mt-8 border-t border-cyan-200/20 pt-5"><p className="font-mono text-xs text-cyan-200">OWNED CLASSES</p>{classrooms.data?.length ? <div className="mt-3 space-y-2">{classrooms.data.map((c) => <button key={c.id} onClick={() => { setSelectedClassroom(c.id); setSelectedAssignment(null); }} className={`w-full border p-3 text-left ${selectedClassroom === c.id ? "border-cyan-200 bg-cyan-200/10" : "border-cyan-200/20 bg-[#071A52]/50"}`}><div className="flex justify-between"><span className="font-semibold">{c.name}</span><span className="font-mono text-cyan-200">{c.joinCode}</span></div><span className="text-xs text-blue-200">{c.level}</span></button>)}</div> : <p className="mt-3 text-sm text-blue-200">No classrooms yet.</p>}</div>
            </section>
            <section className="border border-cyan-200/30 bg-[#0B2770]/90 p-6"><p className="font-mono text-xs tracking-widest text-cyan-200">02 / ASSIGNMENT CONTROL</p><h2 className="mt-2 text-2xl font-semibold">Assignments and progress</h2>{selectedClassroom ? <><div className="mt-5 grid gap-3"><Input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} className="border-cyan-200/30 bg-[#071A52] text-white" placeholder="Assignment title" /><Textarea value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} className="border-cyan-200/30 bg-[#071A52] text-white" placeholder="Instructions students need to complete the task" /><div><Label className="text-blue-100">Due date (optional)</Label><Input type="datetime-local" value={assignmentDueAt} onChange={(e) => setAssignmentDueAt(e.target.value)} className="mt-1 border-cyan-200/30 bg-[#071A52] text-white" /></div><Button className="w-fit bg-cyan-300 text-[#071A52] hover:bg-cyan-200" disabled={createAssignment.isPending || !assignmentTitle.trim()} onClick={() => createAssignment.mutate({ classroomId: selectedClassroom, title: assignmentTitle, instructions: assignmentInstructions, dueAt: assignmentDueAt ? new Date(assignmentDueAt) : null })}>Create assignment</Button></div><div className="mt-7 border-t border-cyan-200/20 pt-5">{assignmentList.data?.map((a) => <button key={a.id} onClick={() => setSelectedAssignment(a.id)} className={`mb-2 w-full border p-3 text-left ${selectedAssignment === a.id ? "border-cyan-200 bg-cyan-200/10" : "border-cyan-200/20"}`}><span className="font-semibold">{a.title}</span><span className="mt-1 block text-xs text-blue-200">{a.instructions}</span><span className="mt-2 block text-xs text-cyan-200">{a.dueAt ? `Due ${new Date(a.dueAt).toLocaleString()}` : "No due date"}</span><input type="datetime-local" aria-label={`Due date for ${a.title}`} defaultValue={a.dueAt ? new Date(a.dueAt).toISOString().slice(0, 16) : ""} onClick={(e) => e.stopPropagation()} onBlur={(e) => updateAssignment.mutate({ id: a.id, dueAt: e.target.value ? new Date(e.target.value) : null })} className="mt-2 w-full border border-cyan-200/20 bg-[#071A52] px-2 py-1 text-xs text-white" /></button>)}</div>{selectedAssignmentRecord && <div className="mt-5 border-t border-cyan-200/20 pt-5"><p className="font-mono text-xs text-cyan-200">PROGRESS / {selectedAssignmentRecord.title.toUpperCase()}</p><div className="mt-3 space-y-2">{progress.data?.map((row) => <div key={row.studentId} className="flex items-center justify-between border-b border-cyan-200/10 py-2 text-sm"><span>{row.studentName || "Student"}</span><span className="text-right text-xs text-blue-200">{row.submittedAt ? `Submitted ${new Date(row.submittedAt).toLocaleString()}` : row.projectUpdatedAt ? "Draft active" : "Not started"}</span></div>)}</div></div>}</> : <p className="mt-5 text-blue-200">Select a classroom to create assignments and inspect progress.</p>}{(isTeacher && teacherNotifications.data?.length) ? <div className="mt-6 border-t border-cyan-200/20 pt-5"><p className="font-mono text-xs text-cyan-200">SUBMISSION NOTIFICATIONS</p>{teacherNotifications.data.slice(0, 5).map((notice) => <div key={notice.id} className="mt-2 border-b border-cyan-200/10 py-2"><p className="text-sm font-semibold">{notice.title}</p><p className="text-xs text-blue-200">{notice.content} / {new Date(notice.createdAt).toLocaleString()}</p><Button size="sm" variant="outline" disabled={Boolean(notice.readAt)} onClick={() => markNotificationRead.mutate({ id: notice.id })} className="mt-2 border-cyan-200/30 bg-transparent text-white hover:bg-cyan-200/10">{notice.readAt ? "Read" : "Mark read"}</Button></div>)}</div> : null}</section>
          </div>
        ) : (
          <div className="relative grid gap-6 lg:grid-cols-[0.75fr_1.25fr]"><section className="border border-cyan-200/30 bg-[#0B2770]/90 p-6"><p className="font-mono text-xs tracking-widest text-cyan-200">01 / ENROLLMENT</p><h2 className="mt-2 text-2xl font-semibold">Join a class</h2><p className="mt-3 text-sm leading-6 text-blue-200">Enter the short six-character code your teacher shared. Only joined classrooms can access your work.</p><div className="mt-5 flex gap-2"><Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} className="border-cyan-200/30 bg-[#071A52] font-mono uppercase text-white" placeholder="ABC234" /><Button className="bg-cyan-300 text-[#071A52] hover:bg-cyan-200" disabled={joinCode.length !== 6 || joinClass.isPending} onClick={() => joinClass.mutate({ joinCode })}>Join</Button></div><div className="mt-8 border-t border-cyan-200/20 pt-5"><p className="font-mono text-xs text-cyan-200">MY CLASSROOMS</p>{memberships.data?.map(({ classroom }) => <button key={classroom.id} onClick={() => { setSelectedClassroom(classroom.id); setSelectedAssignment(null); }} className={`mt-2 w-full border p-3 text-left ${selectedClassroom === classroom.id ? "border-cyan-200 bg-cyan-200/10" : "border-cyan-200/20"}`}><span className="font-semibold">{classroom.name}</span><span className="mt-1 block text-xs text-blue-200">Level: {classroom.level} / Code: {classroom.joinCode}</span></button>)}</div></section><section className="border border-cyan-200/30 bg-[#0B2770]/90 p-6"><p className="font-mono text-xs tracking-widest text-cyan-200">02 / PROJECT BAY</p><h2 className="mt-2 text-2xl font-semibold">Create, save, submit</h2>{selectedClassroom ? <><div className="mt-5 grid gap-3 md:grid-cols-2"><div><Label className="text-blue-100">Project name</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1 border-cyan-200/30 bg-[#071A52] text-white" /></div><div><Label className="text-blue-100">Assignment</Label><select value={selectedAssignment ?? ""} onChange={(e) => setSelectedAssignment(e.target.value ? Number(e.target.value) : null)} className="mt-1 h-10 w-full border border-cyan-200/30 bg-[#071A52] px-3 text-sm text-white"><option value="">Personal practice</option>{studentAssignments.data?.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}</select></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><Textarea value={html} onChange={(e) => setHtml(e.target.value)} className="min-h-40 border-cyan-200/30 bg-[#071A52] font-mono text-xs text-white" placeholder="HTML" /><Textarea value={css} onChange={(e) => setCss(e.target.value)} className="min-h-40 border-cyan-200/30 bg-[#071A52] font-mono text-xs text-white" placeholder="CSS" /><Textarea value={javascript} onChange={(e) => setJavascript(e.target.value)} className="min-h-40 border-cyan-200/30 bg-[#071A52] font-mono text-xs text-white" placeholder="JavaScript" /></div><div className="mt-4 flex flex-wrap gap-2"><Button className="bg-cyan-300 text-[#071A52] hover:bg-cyan-200" onClick={() => saveProject.mutate({ id: projectId, classroomId: selectedClassroom, assignmentId: selectedAssignment, name: projectName, html, css, javascript, lastRunStatus: "not-run", lastRunErrorCount: 0 })}>Save draft</Button>{projectId && selectedAssignment && <Button variant="outline" className="border-cyan-200/40 bg-transparent text-white hover:bg-cyan-200/10" onClick={() => submitProject.mutate({ projectId, assignmentId: selectedAssignment, idempotencyKey: submissionKey, includeSummary: true })}>Submit immutable snapshot</Button>}</div><p className="mt-4 text-xs text-blue-200">Server saves the project as your own draft. Submission copies the current source into an append-only snapshot with a server timestamp.</p>{studentProjects.data?.length ? <div className="mt-6 border-t border-cyan-200/20 pt-5"><p className="font-mono text-xs text-cyan-200">SAVED PROJECTS</p>{studentProjects.data.map((saved) => <div key={saved.id} className="mt-2 flex items-center justify-between border-b border-cyan-200/10 py-2"><div><p className="text-sm font-semibold">{saved.name}</p><p className="text-xs text-blue-200">Updated {new Date(saved.updatedAt).toLocaleString()}</p></div><Button size="sm" variant="outline" className="border-cyan-200/40 bg-transparent text-white hover:bg-cyan-200/10" onClick={() => { setProjectId(saved.id); setProjectName(saved.name); setHtml(saved.html); setCss(saved.css); setJavascript(saved.javascript); setSelectedAssignment(saved.assignmentId); setSubmissionKey(crypto.randomUUID()); }}>Open</Button></div>)}</div> : null}</> : <p className="mt-5 text-blue-200">Join and select a classroom before creating project work.</p>}</section></div>
        )}
      </main>
    </div>
  );
}
