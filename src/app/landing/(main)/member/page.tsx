"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import { LuCheck, LuCreditCard, LuLayoutDashboard, LuPalette, LuPencil, LuPlus, LuReceipt, LuSearch, LuSettings, LuSlidersHorizontal, LuTrash2, LuX } from "react-icons/lu";
// Import Components
import { AddMemberModal } from "@/src/app/components/member/AddMemberModal";
import { PermissionModal } from "@/src/app/components/member/PermissionModal";
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
// Import Api
import { createMember, deleteMember, getMembers, updateMember, updateMemberPermissions } from "@/src/app/lib/api/members";
// Import Auth
import { useCurrentUser } from "@/src/app/lib/auth/permissions";
// Import Landing
import { ROLE_OPTIONS, formatRole, getRoleRank } from "@/src/app/lib/landing/member";
// Import Types
import type { FieldErrors } from "@/src/app/type/api/common";
import type { CreateMemberPayload, MemberStats, PermissionItem } from "@/src/app/type/ui/member";
import type { Permission } from "@/src/app/type/api/auth";
import type { Member, MemberBody, MemberListResponse } from "@/src/app/type/api/members";
// Import Shared
import { formatThaiDateTime } from "@/src/app/lib/shared/format";
import { getFieldErrors } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config permission ที่เลือกได้พร้อมชื่อและไอคอน
const PERMISSIONS: PermissionItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LuLayoutDashboard />,
  },
  {
    key: "transactions",
    label: "รายการจอดรถทั้งหมด",
    icon: <LuReceipt />,
  },
  {
    key: "overview",
    label: "ยอดรวมทั้งหมด",
    icon: <LuCreditCard />,
  },
  {
    key: "pricing",
    label: "กำหนดราคา",
    icon: <LuPencil />,
  },
  {
    key: "devices",
    label: "อุปกรณ์",
    icon: <LuSlidersHorizontal />,
  },
  {
    key: "theme",
    label: "ธีมสี",
    icon: <LuPalette />,
  },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: <LuSettings />,
  },
];

// Config key ของ permission ที่หน้านี้รู้จัก
const PERMISSION_KEYS = new Set(PERMISSIONS.map((permission) => permission.key));



/* -------------------------------------- Helpers -------------------------------------- */


// Function แยกชื่อเต็มเป็นชื่อและนามสกุล
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const names = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = names.shift() ?? "";
  const lastName = names.join(" ");

  return { firstName, lastName };
}

// Function รวมชื่อและนามสกุลของสมาชิก
function getMemberFullName(member: Partial<Member>): string {
  const firstName = member.firstName?.trim() ?? "";
  const lastName = member.lastName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim();
}

// Function กรองเฉพาะ permission ที่รู้จัก
function normalizePermissions(permissions?: string[]): Permission[] {
  const selectedKeys = new Set(permissions ?? []);

  return PERMISSIONS.filter((permission) =>
    selectedKeys.has(permission.key)
  ).map((permission) => permission.key as Permission);
}

// Function ข้อความสำหรับ screen reader เมื่อปุ่มสถานะกดไม่ได้
function StatusToggleDisabledHint({ reason }: { reason: string }): JSX.Element {
  return <span className="sr-only">{reason}</span>;
}



// Function การ์ดตัวเลขสถิติสมาชิก
function StatCard({ title, value }: { title: string; value: number | string }): JSX.Element {
  return (
    <article className="relative min-h-36 rounded-lg bg-gray-200 px-8 pb-5 pt-7">
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-gray-800" />

      <p className="text-sm font-bold text-gray-800">{title}</p>

      <p className="mt-5 text-5xl font-bold leading-none tracking-tight text-slate-700">
        {value}
      </p>
    </article>
  );
}

// Function ปุ่มเปิด/ปิดสถานะสมาชิก
function StatusToggle({
  checked,
  onClick,
  disabled = false,
  title,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`relative h-6 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-green-500" : "bg-gray-300"
        }`}
    >
      {title && disabled ? <StatusToggleDisabledHint reason={title} /> : null}
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition ${checked ? "right-0.5" : "left-0.5"
          }`}
      />
    </button>
  );
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าจัดการสมาชิก เพิ่ม แก้ไข ลบ และกำหนด permission
function MemberPage(): JSX.Element {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalAdmins: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [addFieldErrors, setAddFieldErrors] = useState<FieldErrors>({});
  const [openPermission, setOpenPermission] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Member>>({});

  const [currentDateTime, setCurrentDateTime] = useState("");

  const [form, setForm] = useState<CreateMemberPayload>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
    permissions: ["dashboard"],
  });

  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ให้สิทธิ์ได้เฉพาะที่ตัวเองมี ส่วนกฎของบัญชี (ตัวเอง, super_admin คนสุดท้าย) backend ตรวจ
  const currentUser = useCurrentUser();
  const grantablePermissions = useMemo(
    () => new Set<string>(currentUser?.permissions ?? []),
    [currentUser]
  );

  useEffect(() => {
    function updateDateTime() {
      setCurrentDateTime(formatThaiDateTime(new Date()));
    }

    updateDateTime();

    const intervalId = window.setInterval(updateDateTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // ใส่รายการสมาชิกและตัวเลขสถิติที่โหลดมาลง state (ตารางอยู่ใน data การ์ดสถิติอยู่ใน meta)
  function applyMembers({ data, meta }: MemberListResponse): void {
    setStats({
      totalMembers: meta.totalMembers,
      activeMembers: meta.activeMembers,
      totalAdmins: meta.totalAdmins,
    });
    setMembers(data);
  }

  // ซ่อนแถบโหลดหลังแสดง 100% สักครู่
  function finishLoading(): void {
    setProgress(100);
    window.setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 350);
  }

  async function fetchMembers() {
    try {
      setLoading(true);
      setProgress(8);
      setError("");

      setProgress(18);

      const result = await getMembers();
      setProgress(82);
      applyMembers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      finishLoading();
    }
  }

  // โหลดครั้งแรก (loading เริ่มเป็น true อยู่แล้ว) set state ใน callback เท่านั้น
  useEffect(() => {
    getMembers()
      .then(applyMembers)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"))
      .finally(finishLoading);
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const searchedMembers = !keyword
      ? members
      : members.filter((member) => {
        const fullName = getMemberFullName(member).toLowerCase();
        const email = (member.email ?? "").toLowerCase();
        const phone = member.phone.toLowerCase();

        return (
          fullName.includes(keyword) ||
          email.includes(keyword) ||
          phone.includes(keyword)
        );
      });

    return [...searchedMembers].sort((a, b) => {
      const roleOrder = getRoleRank(b.role) - getRoleRank(a.role);

      if (roleOrder !== 0) return roleOrder;

      return getMemberFullName(a).localeCompare(getMemberFullName(b), "th");
    });
  }, [members, search]);

  function handleStartEdit(member: Member) {
    const fallbackName = splitFullName(getMemberFullName(member));

    setEditingId(member.id);
    setEditDraft({
      firstName: member.firstName || fallbackName.firstName,
      lastName: member.lastName || fallbackName.lastName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  async function handleSaveEdit(memberId: string) {
    try {
      setSubmitting(true);
      setError("");

      await updateMember(memberId, {
        firstName: String(editDraft.firstName ?? "").trim(),
        lastName: String(editDraft.lastName ?? "").trim(),
        email: String(editDraft.email ?? "").trim() || null,
        phone: String(editDraft.phone ?? "").trim(),
        role: editDraft.role,
        status: editDraft.status,
      });

      handleCancelEdit();
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(member: Member) {
    const nextStatus: Member["status"] =
      member.status === "active" ? "inactive" : "active";

    try {
      await updateMember(member.id, { status: nextStatus });

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  async function handleDelete(memberId: string) {
    const confirmDelete = window.confirm("ต้องการลบสมาชิกนี้หรือไม่?");

    if (!confirmDelete) return;

    try {
      await deleteMember(memberId);

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  function handleOpenAdd() {
    setAddError("");
    setAddFieldErrors({});
    setOpenAdd(true);
  }

  async function handleCreateMember() {
    try {
      setSubmitting(true);
      setError("");
      setAddError("");
      setAddFieldErrors({});

      const payload: MemberBody = {
        ...form,
        email: form.email.trim() || null,
        permissions: normalizePermissions(form.permissions).filter((key) =>
          grantablePermissions.has(key)
        ),
      };

      await createMember(payload);

      setOpenAdd(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        role: "staff",
        permissions: ["dashboard"],
      });

      await fetchMembers();
    } catch (err) {
      // แสดงใน dialog ส่วน VALIDATION_ERROR แสดงใต้แต่ละช่อง
      setAddFieldErrors(getFieldErrors(err));
      setAddError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenPermission(member: Member) {
    setSelectedMember(member);
    setPermissionDraft(normalizePermissions(member.permissions));
    setOpenPermission(true);
  }

  function handleTogglePermission(key: string) {
    if (!PERMISSION_KEYS.has(key) || !grantablePermissions.has(key)) return;

    setPermissionDraft((prev) => {
      const nextPermissions = new Set(prev);

      if (nextPermissions.has(key)) {
        nextPermissions.delete(key);
      } else {
        nextPermissions.add(key);
      }

      return PERMISSIONS.filter((permission) =>
        nextPermissions.has(permission.key)
      ).map((permission) => permission.key);
    });
  }

  function handleClosePermission() {
    setOpenPermission(false);
    setSelectedMember(null);
    setPermissionDraft([]);
  }

  async function handleSavePermission() {
    if (!selectedMember) return;

    try {
      setSubmitting(true);
      setError("");

      // PATCH /members/:id ด้วย permissions ได้ Member ที่แก้แล้วกลับมา
      await updateMemberPermissions(selectedMember.id, normalizePermissions(permissionDraft));

      handleClosePermission();
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen
        open
        progress={progress}
        message="กำลังโหลดข้อมูล..."
        detail="กำลังโหลดข้อมูลสมาชิก"
        fullscreen={false}
      />
    );
  }

  return (
    <>
      <section className="min-h-screen bg-gray-100 px-4 py-6 text-gray-800 md:px-8 md:py-8 xl:px-20">
        <div className="mx-auto max-w-screen-7xl">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500 bg-green-50 px-4 py-2 text-sm font-semibold text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Online</span>
            </div>

            <p className="text-sm text-gray-400">{currentDateTime || "-"}</p>
          </div>

          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[30px] font-bold leading-none tracking-tight text-gray-800 sm:text-4xl">
                การตั้งค่าสมาชิก
              </h1>

              <p className="mt-4 text-sm text-gray-500 sm:text-base">
                จัดการข้อมูลและสิทธิ์การใช้งานของสมาชิก
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <div className="flex h-12 w-full items-center rounded-full border border-gray-800 bg-white px-5 sm:w-80">
                <LuSearch size={18} className="text-gray-500" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหา..."
                  className="ml-3 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex h-12 items-center gap-3 rounded-full bg-slate-900 px-7 text-sm font-bold text-white transition hover:opacity-90"
              >
                <LuPlus size={17} />
                เพิ่มสมาชิก
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <StatCard title="สมาชิกทั้งหมด" value={stats.totalMembers} />
            <StatCard title="กำลังใช้งาน" value={stats.activeMembers} />
            <StatCard title="SUPER ADMINS" value={stats.totalAdmins} />
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-900 bg-white">
            <table className="min-w-max w-full table-auto">
              <thead className="bg-slate-900 text-left text-sm font-bold text-white">
                <tr>
                  <th className="px-10 py-8">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-8">E-MAIL</th>
                  <th className="px-6 py-8">โทรศัพท์</th>
                  <th className="px-6 py-8">ตำแหน่ง</th>
                  <th className="px-6 py-8">สถานะ</th>
                  <th className="px-6 py-8 text-center">การจัดการ</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-10 py-10 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลสมาชิก
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isEditing = editingId === member.id;
                
                    return (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="px-10 py-8">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                value={editDraft.firstName ?? ""}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    firstName: event.target.value,
                                  }))
                                }
                                placeholder="ชื่อ"
                                className="h-9 w-32 border border-gray-800 px-3 text-sm outline-none"
                              />

                              <input
                                value={editDraft.lastName ?? ""}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    lastName: event.target.value,
                                  }))
                                }
                                placeholder="นามสกุล"
                                className="h-9 w-36 border border-gray-800 px-3 text-sm outline-none"
                              />
                            </div>
                          ) : (
                            <span className="text-base font-bold text-gray-900">
                              {getMemberFullName(member) || "-"}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <input
                              value={editDraft.email ?? ""}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  email: event.target.value,
                                }))
                              }
                              className="h-9 w-52 border border-gray-800 px-3 text-sm outline-none"
                            />
                          ) : (
                            member.email || "-"
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <input
                              value={editDraft.phone ?? ""}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  phone: event.target.value,
                                }))
                              }
                              className="h-9 w-40 border border-gray-800 px-3 text-sm outline-none"
                            />
                          ) : (
                            member.phone || "-"
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <select
                              value={editDraft.role ?? member.role}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  role: event.target.value as Member["role"],
                                }))
                              }
                              className="h-9 rounded-md border border-gray-800 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}

                            </select>
                          ) : (
                            <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-bold">
                              {formatRole(member.role)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-8">
                          <StatusToggle
                            checked={member.status === "active"}
                            onClick={() => handleToggleStatus(member)}
                          />
                        </td>

                        <td className="px-6 py-8">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleOpenPermission(member)}
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm font-bold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <LuSettings size={15} />
                              ตั้งค่าสิทธิ์
                            </button>

                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(member.id)}
                                  disabled={submitting}
                                  className="text-green-600 disabled:opacity-60"
                                >
                                  <LuCheck size={22} />
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  disabled={submitting}
                                  className="text-gray-500 disabled:opacity-60"
                                >
                                  <LuX size={22} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(member)}
                                  title="แก้ไข"
                                  className="text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <LuPencil size={22} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(member.id)}
                                  title="ลบ"
                                  className="text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <LuTrash2 size={22} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AddMemberModal
        open={openAdd}
        form={form}
        error={addError}
        fieldErrors={addFieldErrors}
        submitting={submitting}
        onClose={() => setOpenAdd(false)}
        onChange={setForm}
        onSubmit={handleCreateMember}
      />

      <PermissionModal
        open={openPermission}
        permissions={PERMISSIONS}
        isGrantable={(key) => grantablePermissions.has(key)}
        selectedPermissions={permissionDraft}
        submitting={submitting}
        onClose={handleClosePermission}
        onToggle={handleTogglePermission}
        onSubmit={handleSavePermission}
      />
    </>
  );
}

export default MemberPage;
