import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Liên kết không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      setLoading(true);
      const res = await authService.resetPassword(token, newPassword);
      setMessage(res?.message || "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 absolute inset-0 z-0 bg-gradient-purple">
      <div className="w-full max-w-sm md:max-w-md">
        <Card className="overflow-hidden border-border">
          <CardContent className="p-6 md:p-8 space-y-4">
            <Link to="/LoginPage" className="text-xs text-muted-foreground hover:underline">
              ← Quay lại đăng nhập
            </Link>
            <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
            <p className="text-sm text-muted-foreground">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              {message && !error && <p className="text-emerald-500 text-sm">{message}</p>}
              <Button
                type="submit"
                className="w-full px-8 py-3 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 rounded-xl"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

