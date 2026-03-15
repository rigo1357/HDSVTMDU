import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!identifier.trim()) {
      setError("Vui lòng nhập email hoặc tên đăng nhập");
      return;
    }
    try {
      setLoading(true);
      const res = await authService.forgotPassword(identifier.trim());
      setMessage(res?.message || "Đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra email.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.";
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
            <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
            <p className="text-sm text-muted-foreground">
              Nhập email hoặc tên đăng nhập của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu qua email.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email hoặc tên đăng nhập</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="vd: moji hoặc email@stu.edu.vn"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                {loading ? "Đang gửi..." : "Gửi hướng dẫn"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

