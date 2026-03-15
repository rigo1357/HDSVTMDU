import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "../ui/label";
import { useAuth } from "@/UseAuth/AuthContext";
import { authService } from "@/services/authService";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const signInSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormValues) => {
    setAuthError(null);
    try {
      const { accessToken, user } = await authService.signIn(data.username, data.password);
      const profile = user ?? (await authService.fetchMe(accessToken));

      const normalizedUser = profile
        ? {
            id: profile.id || profile._id || "",
            fullName: profile.fullName || profile.displayName || profile.username || "",
            email: profile.email || "",
            studentId: profile.studentId,
            faculty: profile.faculty,
            role: profile.role,
          }
        : undefined;

      login(accessToken, normalizedUser);
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError("Sai tài khoản hoặc mật khẩu");
    }
  };

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card className="overflow-hidden p-0 border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-6">
              {/* header - logo */}
              <div className="flex flex-col items-center text-center gap-2">
                <a
                  href="/"
                  className="mx-auto block w-fit text-center"
                >
                  <img
                    src="/logo.svg"
                    alt="logo"
                  />
                </a>

                <h1 className="text-2xl font-bold">Chào mừng quay lại</h1>
                <p className="text-muted-foreground text-balance">
                  Đăng nhập vào tài khoản STUTECH của bạn
                </p>
              </div>

              {/* username */}
              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="username"
                  className="block text-sm"
                >
                  Tên đăng nhập
                </Label>
                <Input
                  type="text"
                  id="username"
                  placeholder="moji"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* password */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="block text-sm"
                  >
                    Mật khẩu
                  </Label>
                  <a
                    href="/auth/forgot-password"
                    className="text-xs text-cyan-500 hover:underline"
                  >
                    Quên mật khẩu?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {authError && (
                <p className="text-destructive text-sm text-center">
                  {authError}
                </p>
              )}

              {/* nút đăng nhập */}
              <Button
                type="submit"
                className="w-full px-8 py-3 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition run-cyan"
                disabled={isSubmitting}
              >
                Đăng nhập
              </Button>

              <div className="text-center text-sm">
                Chưa có tài khoản?{" "}
                <a
                  href="/SignUp"
                  className="underline underline-offset-4"
                >
                  Đăng ký
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.png"
              alt="Image"
              className="absolute top-1/2 -translate-y-1/2 object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className=" text-xs text-balance px-6 text-center *:[a]:hover:text-primary text-muted-foreground *:[a]:underline *:[a]:underline-offetset-4">
        Bằng cách tiếp tục, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> và{" "}
        <a href="#">Chính sách bảo mật</a> của chúng tôi.
      </div>
    </div>
  );
}