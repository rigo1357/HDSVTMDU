import { Pencil, Plus, Shield, Trash2, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import type { AdminUser } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";

const roleLabels: Record<string, string> = {
  student: "Sinh viên",
  manager: "Quản lý",
  admin: "Admin",
  guest: "Khách",
};

const statusLabels: Record<string, string> = {
  active: "Hoạt động",
  locked: "Tạm khoá",
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setUsers(data);
    } catch (error) {
      console.error("Không thể tải danh sách tài khoản", error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const emptyState = useMemo(
    () =>
      !loading && users.length === 0 ? (
        <tr>
          <td colSpan={5} className="py-6 text-center text-slate-500">
            Không có tài khoản nào phù hợp bộ lọc.
          </td>
        </tr>
      ) : null,
    [loading, users.length]
  );

  function UserCreateModal({ onCreated }) {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset, watch } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    return (
      <Dialog open={open} onOpenChange={(val)=>{setOpen(val);if(!val) setErrorMsg("");}}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#050710] font-medium px-4 py-2 rounded-xl transition">
            <Plus size={18} /> Tạo tài khoản
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản mới</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={handleSubmit(async (data) => {
              // Validate
              if (!data.fullName || !data.email || !data.username || !data.password) {
                setErrorMsg("Vui lòng điền đầy đủ thông tin bắt buộc");
                return;
              }
              if (data.password.length < 6) {
                setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự");
                return;
              }
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(data.email)) {
                setErrorMsg("Email không hợp lệ");
                return;
              }
              
              // Validate student-specific fields if role is student
              if (data.role === "student") {
                if (!data.studentCode) {
                  setErrorMsg("MSSV là bắt buộc cho tài khoản sinh viên");
                  return;
                }
                if (data.phoneNumber && !/^\d{10}$/.test(data.phoneNumber)) {
                  setErrorMsg("Số điện thoại phải có 10 số");
                  return;
                }
              }

              setLoading(true);
              setErrorMsg("");
              try {
                await adminService.createUser({ 
                  displayName: data.fullName,
                  email: data.email,
                  username: data.username,
                  password: data.password,
                  role: data.role || "student",
                  status: data.status || "active",
                  studentCode: data.studentCode,
                  phoneNumber: data.phoneNumber,
                  department: data.department,
                  class: data.class,
                  dateOfBirth: data.dateOfBirth,
                  address: data.address
                });
                reset();
                setOpen(false);
                toast.success("Tạo tài khoản thành công!");
                onCreated?.();
              } catch (err: any) {
                const errorMessage = err?.response?.data?.message || err?.message || "Lỗi không xác định";
                setErrorMsg(errorMessage);
                toast.error(errorMessage);
              } finally { 
                setLoading(false); 
              }
            })}
          >
            <Input placeholder="Họ tên *" {...register("fullName", { required: "Họ tên là bắt buộc" })} />
            <Input placeholder="Email *" type="email" {...register("email", { required: "Email là bắt buộc" })} />
            <Input placeholder="Username *" {...register("username", { required: "Username là bắt buộc" })} />
            <Input placeholder="Password * (tối thiểu 6 ký tự)" type="password" {...register("password", { required: "Password là bắt buộc", minLength: 6 })} />
            <Select {...register("role", { required: true })}>
              <SelectTrigger><SelectValue placeholder="Chọn vai trò *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Quản lý</SelectItem>
                <SelectItem value="student">Sinh viên</SelectItem>
                <SelectItem value="guest">Khách</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Student-specific fields */}
            {watch("role") === "student" && (
              <>
                <Input placeholder="MSSV *" {...register("studentCode", { required: "MSSV là bắt buộc" })} />
                <Input placeholder="Số điện thoại (10 số)" type="tel" maxLength={10} {...register("phoneNumber")} />
                <Input placeholder="Khoa / Ngành" {...register("department")} />
                <Input placeholder="Lớp" {...register("class")} />
                <Input placeholder="Ngày sinh" type="date" {...register("dateOfBirth")} />
                <Input placeholder="Địa chỉ" {...register("address")} />
              </>
            )}
            
            <Select {...register("status", { required: true })}>
              <SelectTrigger><SelectValue placeholder="Trạng thái *" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="locked">Tạm khoá</SelectItem>
              </SelectContent>
            </Select>
            {errorMsg && <div className="text-red-500 rounded bg-red-50 dark:bg-red-900/20 p-2 text-sm mt-1">{errorMsg}</div>}
            <DialogFooter>
              <button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 py-2 text-white font-medium" disabled={loading} type="submit">
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  function RoleModal({ user, onUpdated }) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState(user.role);
    const [status, setStatus] = useState(user.status);
    const [loading, setLoading] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="p-2 rounded-xl border border-amber-400/40 text-amber-200 hover:bg-amber-500/10"><Shield size={16} /></button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Phân quyền tài khoản</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              await adminService.updateUser(user._id, { role, status });
              setOpen(false); onUpdated?.(); setLoading(false);
            }}
          >
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Quản lý</SelectItem>
                <SelectItem value="student">Sinh viên</SelectItem>
                <SelectItem value="guest">Khách</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động (kích hoạt)</SelectItem>
                <SelectItem value="locked">Tạm khoá / vô hiệu hóa</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter><button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 py-2 text-white font-medium" disabled={loading}>Cập nhật</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AdminLayout
      title="Quản lý tài khoản"
      subtitle="Tạo, chỉnh sửa, khoá/mở tài khoản và phân quyền"
      actions={
        <UserCreateModal onCreated={fetchUsers}/>
      }
    >
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="student">Sinh viên</option>
            <option value="manager">Quản lý</option>
            <option value="admin">Admin</option>
            <option value="guest">Khách</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Tạm khoá</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3">Họ tên</th>
                <th className="py-3">Email</th>
                <th className="py-3">Vai trò</th>
                <th className="py-3">Trạng thái</th>
                <th className="py-3 text-right">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((user) => (
                  <tr key={user._id} className="border-b border-white/5 last:border-none">
                    <td className="py-3">{user.displayName || user.fullName}</td>
                    <td className="py-3 text-slate-400">{user.email}</td>
                    <td className="py-3">
                      <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-200 border border-cyan-400/30 capitalize">
                        {roleLabels[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          user.status === "active"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/30"
                            : "bg-amber-500/10 text-amber-200 border border-amber-400/30"
                        } capitalize`}
                      >
                        {statusLabels[user.status] ?? user.status}
                      </span>
                    </td>
                    <td className="py-3 flex items-center justify-end gap-2">
                      {/* Nút đổi tên nhanh */}
                      <button
                        onClick={async () => {
                          const displayName = prompt("Tên mới:", user.displayName || user.fullName) ?? user.displayName;
                          try {
                            await adminService.updateUser(user._id, { displayName });
                            fetchUsers();
                          } catch (error) {
                            console.error("Không thể cập nhật tài khoản", error);
                          }
                        }}
                        className="p-2 rounded-xl border border-white/10 hover:bg-white/10"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Nút kích hoạt nhanh: set status=active => isActive & emailVerified = true (backend xử lý) */}
                      {user.status !== "active" && (
                        <button
                          onClick={async () => {
                            try {
                              await adminService.updateUser(user._id, { status: "active" });
                              toast.success(`Đã kích hoạt tài khoản ${user.displayName || user.fullName}`);
                              fetchUsers();
                            } catch (error) {
                              console.error("Không thể kích hoạt tài khoản", error);
                              toast.error("Không thể kích hoạt tài khoản");
                            }
                          }}
                          className="p-2 rounded-xl border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
                          title="Kích hoạt tài khoản"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}

                      {/* Popup phân quyền chi tiết */}
                      <RoleModal user={user} onUpdated={fetchUsers} />

                      {/* Xoá tài khoản */}
                      <button
                        onClick={async () => {
                          if (!confirm(`Xoá tài khoản ${user.displayName || user.fullName}?`)) return;
                          try {
                            await adminService.deleteUser(user._id);
                            fetchUsers();
                          } catch (error) {
                            console.error("Không thể xoá tài khoản", error);
                          }
                        }}
                        className="p-2 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

              {emptyState}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;

