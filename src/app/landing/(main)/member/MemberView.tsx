"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { columnFilteringFeature, createColumnHelper, createFilteredRowModel, createSortedRowModel, globalFilteringFeature, rowSortingFeature, tableFeatures, useTable, type FilterFn, type SortFn } from "@tanstack/react-table";
import { LuCheck, LuCreditCard, LuLayoutDashboard, LuPalette, LuPencil, LuPlus, LuReceipt, LuSearch, LuSettings, LuSlidersHorizontal, LuTrash2, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Import Components
import { AddMemberModal } from "@/src/app/components/member/AddMemberModal";
import { PermissionModal } from "@/src/app/components/member/PermissionModal";
import { FieldError } from "@/src/app/components/shared/FieldError";
import { SelectField } from "@/src/app/components/shared/SelectField";
// Import Actions
import { createMember, deleteMember, updateMember, updateMemberPermissions } from "@/src/app/lib/actions/members";
// Import Client
import { membersQuery } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
import { applyServerErrors } from "@/src/app/lib/client/forms";
// Import Providers
import { useCurrentUser } from "@/src/app/providers/SessionProvider";
import { useConfirm } from "@/src/app/providers/ConfirmProvider";
// Import Landing
import { ROLE_OPTIONS, formatRole, getRoleRank } from "@/src/app/lib/landing/member";
// Import Types
import type { CreateMemberForm, EditMemberForm, PermissionItem } from "@/src/app/type/ui/member";
import type { Permission } from "@/src/app/type/api/auth";
import type { Member, MemberBody, MemberListQuery, MemberListResponse } from "@/src/app/type/api/members";
// Import Shared
import { formatThaiDateTime } from "@/src/app/lib/shared/format";
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { editMemberSchema } from "@/src/app/lib/shared/schemas/member";

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

// Config prefix ของ cache สมาชิก (invalidate ทุก query ของสมาชิก)
const MEMBERS_KEY = ["members"];

// Config query ของรายการสมาชิก (ทั้งหมด แล้วค้นหาและเรียงในตาราง)
const MEMBER_LIST_QUERY: MemberListQuery = {};

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

// Function ค้นหาสมาชิกจากคำที่พิมพ์ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
const memberKeywordFilter: FilterFn<typeof memberTableFeatures, Member> = (row, columnId, filterValue) => {
  const keyword = String(filterValue).trim().toLowerCase();
  return !keyword || String(row.getValue(columnId)).toLowerCase().includes(keyword);
};

// Function เรียง super_admin ก่อน แล้วตามชื่อภาษาไทย
const memberRoleThenNameSort: SortFn<typeof memberTableFeatures, Member> = (rowA, rowB) => {
  const roleOrder = getRoleRank(rowB.original.role) - getRoleRank(rowA.original.role);
  if (roleOrder !== 0) return roleOrder;
  return getMemberFullName(rowA.original).localeCompare(getMemberFullName(rowB.original), "th");
};

// Config feature ของตารางสมาชิก: ค้นหาจากชื่อ อีเมล โทรศัพท์ และเรียงตามตำแหน่ง/ชื่อ
const memberTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

// Config คอลัมน์ที่ใช้ค้นหาและเรียง (หน้าตาของแถว render เองด้านล่าง)
const memberColumnHelper = createColumnHelper<typeof memberTableFeatures, Member>();
const memberColumns = memberColumnHelper.columns([
  memberColumnHelper.accessor((member) => getMemberFullName(member), { id: "name", sortFn: memberRoleThenNameSort }),
  memberColumnHelper.accessor((member) => member.email ?? "", { id: "email" }),
  memberColumnHelper.accessor("phone", {}),
]);

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

// Function หน้าจัดการสมาชิก เพิ่ม แก้ไข ลบ และกำหนด permission (รายการแรกโหลดจาก server)
function MemberView({ initialData }: { initialData: MemberListResponse }): JSX.Element {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  // รายการแรกโหลดจาก server แล้ว หลังแก้ไขโหลดใหม่ด้วย invalidate
  const { data: memberList, error: loadError } = useQuery({ ...membersQuery(MEMBER_LIST_QUERY), initialData });
  const members = memberList.data;
  const stats = memberList.meta;
  const error = loadError ? getErrorMessage(loadError, "เกิดข้อผิดพลาด") : "";

  const table = useTable({
    features: memberTableFeatures,
    columns: memberColumns,
    data: members,
    globalFilterFn: memberKeywordFilter,
    initialState: { sorting: [{ id: "name", desc: false }], globalFilter: "" },
  });
  const search = String(table.state.globalFilter ?? "");

  const [openAdd, setOpenAdd] = useState(false);
  // เปลี่ยนทุกครั้งที่เปิด ให้ dialog เพิ่มสมาชิกเริ่มฟอร์มใหม่
  const [addFormKey, setAddFormKey] = useState(0);
  const [openPermission, setOpenPermission] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editForm = useForm<EditMemberForm>({ resolver: zodResolver(editMemberSchema) });
  const editErrors = editForm.formState.errors;

  const [currentDateTime, setCurrentDateTime] = useState("");

  // เปลี่ยนทุกครั้งที่เปิด ให้ dialog สิทธิ์เริ่มจากสิทธิ์ของสมาชิกที่เลือก
  const [permissionFormKey, setPermissionFormKey] = useState(0);

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

  // แก้สมาชิกแล้วโหลดรายการและการ์ดสถิติใหม่
  function reloadMembers() {
    return queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
  }

  const saveMember = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MemberBody }) => unwrap(updateMember(id, body)),
    onSuccess: reloadMembers,
  });

  const removeMember = useMutation({
    mutationFn: (id: string) => unwrap(deleteMember(id)),
    onSuccess: reloadMembers,
  });

  const addMember = useMutation({
    mutationFn: (body: MemberBody) => unwrap(createMember(body)),
    onSuccess: reloadMembers,
  });

  const savePermissions = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Permission[] }) => unwrap(updateMemberPermissions(id, permissions)),
    onSuccess: reloadMembers,
  });

  function handleStartEdit(member: Member) {
    const fallbackName = splitFullName(getMemberFullName(member));

    setEditingId(member.id);
    editForm.reset({
      firstName: member.firstName || fallbackName.firstName,
      lastName: member.lastName || fallbackName.lastName,
      email: member.email ?? "",
      phone: member.phone,
      role: member.role,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    editForm.reset();
  }

  // ตรวจ schema ก่อนส่ง (ไม่ส่ง status เพราะเปลี่ยนจากสวิตช์ในแถวแยกกัน ส่งค่าเดิมจะทับสวิตช์)
  function handleSaveEdit(memberId: string) {
    void editForm.handleSubmit(async (values) => {
      try {
        await saveMember.mutateAsync({ id: memberId, body: { ...values, email: values.email || null } });
        handleCancelEdit();
      } catch (err) {
        applyServerErrors(editForm.setError, err);
        toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
      }
    })();
  }

  async function handleToggleStatus(member: Member) {
    const nextStatus: Member["status"] =
      member.status === "active" ? "inactive" : "active";

    try {
      await saveMember.mutateAsync({ id: member.id, body: { status: nextStatus } });
    } catch (err) {
      toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
    }
  }

  async function handleDelete(memberId: string) {
    const confirmDelete = await confirm({
      title: "ลบสมาชิก?",
      description: "ต้องการลบสมาชิกนี้หรือไม่?",
      confirmLabel: "ลบ",
      destructive: true,
    });

    if (!confirmDelete) return;

    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
    }
  }

  function handleOpenAdd() {
    setAddFormKey((value) => value + 1);
    setOpenAdd(true);
  }

  // บันทึกไม่สำเร็จให้ throw ออกไป dialog แสดง error ใต้ช่องและด้านล่างเอง
  async function handleCreateMember(values: CreateMemberForm) {
    const payload: MemberBody = {
      ...values,
      email: values.email || null,
      permissions: normalizePermissions(["dashboard"]).filter((key) => grantablePermissions.has(key)),
    };

    await addMember.mutateAsync(payload);
    setOpenAdd(false);
  }

  function handleOpenPermission(member: Member) {
    setSelectedMember(member);
    setPermissionFormKey((value) => value + 1);
    setOpenPermission(true);
  }

  function handleClosePermission() {
    setOpenPermission(false);
    setSelectedMember(null);
  }

  // ให้ได้เฉพาะสิทธิ์ที่หน้านี้รู้จักและผู้ใช้ปัจจุบันมี บันทึกไม่สำเร็จ throw ต่อให้ dialog คงเปิดไว้
  async function handleSavePermission(permissions: string[]) {
    if (!selectedMember) return;

    try {
      // PATCH /members/:id ด้วย permissions ได้ Member ที่แก้แล้วกลับมา
      await savePermissions.mutateAsync({
        id: selectedMember.id,
        permissions: normalizePermissions(permissions.filter((key) => PERMISSION_KEYS.has(key))),
      });
      handleClosePermission();
    } catch (err) {
      toast.error(getErrorMessage(err, "เกิดข้อผิดพลาด"));
      throw err;
    }
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
                  onChange={(event) => table.setGlobalFilter(event.target.value)}
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
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-10 py-10 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลสมาชิก
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(({ original: member }) => {
                    const isEditing = editingId === member.id;
                
                    return (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="px-10 py-8">
                          {isEditing ? (
                            <div>
                            <div className="flex gap-2">
                              <input
                                {...editForm.register("firstName")}
                                aria-invalid={Boolean(editErrors.firstName)}
                                placeholder="ชื่อ"
                                className="h-9 w-32 border border-gray-800 px-3 text-sm outline-none aria-invalid:border-red-500"
                              />

                              <input
                                {...editForm.register("lastName")}
                                aria-invalid={Boolean(editErrors.lastName)}
                                placeholder="นามสกุล"
                                className="h-9 w-36 border border-gray-800 px-3 text-sm outline-none aria-invalid:border-red-500"
                              />
                            </div>
                            <FieldError message={editErrors.firstName?.message ?? editErrors.lastName?.message} />
                            </div>
                          ) : (
                            <span className="text-base font-bold text-gray-900">
                              {getMemberFullName(member) || "-"}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <div>
                              <input
                                {...editForm.register("email")}
                                aria-invalid={Boolean(editErrors.email)}
                                className="h-9 w-52 border border-gray-800 px-3 text-sm outline-none aria-invalid:border-red-500"
                              />
                              <FieldError message={editErrors.email?.message} />
                            </div>
                          ) : (
                            member.email || "-"
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <div>
                              <input
                                {...editForm.register("phone")}
                                aria-invalid={Boolean(editErrors.phone)}
                                className="h-9 w-40 border border-gray-800 px-3 text-sm outline-none aria-invalid:border-red-500"
                              />
                              <FieldError message={editErrors.phone?.message} />
                            </div>
                          ) : (
                            member.phone || "-"
                          )}
                        </td>

                        <td className="px-6 py-8">
                          {isEditing ? (
                            <Controller
                              control={editForm.control}
                              name="role"
                              render={({ field }) => (
                                <SelectField
                                  aria-label="ตำแหน่ง"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={ROLE_OPTIONS}
                                  className="h-9 rounded-md border border-gray-800 bg-white px-3 text-sm"
                                />
                              )}
                            />
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
                                  disabled={editForm.formState.isSubmitting}
                                  className="text-green-600 disabled:opacity-60"
                                >
                                  <LuCheck size={22} />
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  disabled={editForm.formState.isSubmitting}
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
        key={addFormKey}
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleCreateMember}
      />

      <PermissionModal
        key={permissionFormKey}
        open={openPermission}
        permissions={PERMISSIONS}
        isGrantable={(key) => grantablePermissions.has(key)}
        defaultPermissions={normalizePermissions(selectedMember?.permissions)}
        onClose={handleClosePermission}
        onSubmit={handleSavePermission}
      />
    </>
  );
}

export { MemberView };
