import { DatabaseBackup, KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { adminService } from "@/services/adminService";
import type { AdvancedFeature, SecurityLogEntry } from "@/types/admin";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  permissions: UserCog,
  audit: ShieldCheck,
  security: KeyRound,
  backup: DatabaseBackup,
};

const SecurityLogsModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminService.getSecurityLogs(50);
        setLogs(data);
      } catch (error) {
        console.error("Không thể tải log bảo mật", error);
        toast.error("Không thể tải log bảo mật");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0b1021] text-white border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-lg">Log bảo mật</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto text-sm space-y-2">
            {logs.map((log) => (
              <div
                key={log._id}
                className="border border-white/10 rounded-xl p-3 flex justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">{log.action}</div>
                  <div className="text-xs text-slate-400">
                    {log.user?.displayName} ({log.user?.email}) •{" "}
                    <span className="italic">{log.target}</span>
                  </div>
                  {log.metadata && (
                    <div className="text-xs text-slate-500 mt-1">
                      {Object.entries(log.metadata).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </div>
                  {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                </div>
              </div>
            ))}
            {!logs.length && (
              <p className="text-slate-400">Chưa có log nào.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AdminAdvancedPage = () => {
  const [features, setFeatures] = useState<AdvancedFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatures = async () => {
      try {
        const data = await adminService.getAdvancedFeatures();
        if (isMounted && data?.length) {
          setFeatures(data);
        }
      } catch (error) {
        console.error("Không thể tải tính năng đặc biệt", error);
        toast.error("Không thể tải tính năng đặc biệt");
      }
    };
    fetchFeatures();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (feature: AdvancedFeature) => {
    try {
      setLoading(true);
      const updated = await adminService.updateAdvancedFeature(feature.key, {
        status: !feature.status,
      });
      setFeatures(features.map((f) => (f.key === feature.key ? updated : f)));
      toast.success(`Đã ${updated.status ? "bật" : "tắt"} ${feature.title}`);
    } catch (error) {
      console.error("Không thể cập nhật tính năng", error);
      toast.error("Không thể cập nhật tính năng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Tính năng đặc biệt"
      subtitle="Phân quyền, bảo mật, log hệ thống và backup dữ liệu"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có cấu hình tính năng nào.</p>
        )}
        {features.map((feature) => {
          const Icon = iconMap[feature.key] ?? ShieldCheck;
          const isAudit = feature.key === "audit";
          return (
            <div key={feature.key} className="border border-white/10 rounded-2xl p-6 bg-white/5 flex flex-col gap-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Icon size={18} /> {feature.title}
              </h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => handleToggle(feature)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl text-sm transition ${
                    feature.status
                      ? "bg-emerald-500/10 text-blue-900 border border-emerald-400/30 hover:bg-emerald-500/20"
                      : "bg-slate-500/10 text-blue-900 border border-slate-400/30 hover:bg-slate-500/20"
                  } disabled:opacity-50`}
                >
                  {feature.status ? "Đang bật" : "Đang tắt"}
                </button>
                <button
                  className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/10 text-blue-900"
                  onClick={() => {
                    if (isAudit) {
                      setLogsOpen(true);
                    } else {
                      toast.info("Thiết lập chi tiết sẽ được bổ sung sau.");
                    }
                  }}
                >
                  Thiết lập
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <SecurityLogsModal open={logsOpen} onOpenChange={setLogsOpen} />
    </AdminLayout>
  );
};

export default AdminAdvancedPage;

