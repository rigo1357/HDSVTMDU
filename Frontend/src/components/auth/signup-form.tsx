import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "../ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

const signUpSchema = z.object({
  firstname: z.string().min(1, "Tên bắt buộc phải có"),
  lastname: z.string().min(1, "Họ bắt buộc phải có"),
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(1, "Xác nhận mật khẩu không được để trống"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState<string>("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const emailValue = watch("email");

  // Kiểm tra email khi blur hoặc khi submit
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes("@")) return;
    
    try {
      setCheckingEmail(true);
      // Gọi API kiểm tra email (giả sử có endpoint này)
      // Nếu không có endpoint thực, có thể validate format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError("Email không đúng định dạng");
        return false;
      }
      
      // Kiểm tra email có tồn tại trong hệ thống không
      try {
        await api.post("/auth/check-email", { email });
        setEmailError("");
        return true;
      } catch (error: any) {
        // Nếu email đã tồn tại hoặc không hợp lệ
        if (error.response?.status === 409) {
          setEmailError("Email đã được sử dụng");
          return false;
        }
        // Nếu không có endpoint, chỉ validate format
        setEmailError("");
        return true;
      }
    } catch (error) {
      // Nếu không có endpoint check-email, chỉ validate format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError("Email không đúng định dạng");
        return false;
      }
      setEmailError("");
      return true;
    } finally {
      setCheckingEmail(false);
    }
  };

  const onSubmit = async (data: SignUpFormValues) => {
    const { firstname, lastname, username, email, password, confirmPassword } = data;

    // Kiểm tra xác nhận mật khẩu
    if (password !== confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Mật khẩu xác nhận không khớp.",
      });
      return;
    }

    // Kiểm tra email trước khi submit
    const emailValid = await checkEmailExists(email);
    if (!emailValid) {
      toast.error("Email không tồn tại. Vui lòng kiểm tra lại.");
      return;
    }

    // gọi backend để signup
    await signUp(username, password, email, firstname, lastname);

    navigate("/LoginPage");
  };

  return (
    <div
      className={cn("flex  flex-col gap-6", className)}
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

                <h1 className="text-2xl font-bold">Tạo tài khoản STUTECH</h1>
                <p className="text-muted-foreground text-balance">
                  Chào mừng bạn! Hãy đăng ký để bắt đầu!
                </p>
              </div>

              {/* họ & tên */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="lastname"
                    className="block text-sm"
                  >
                    Họ
                  </Label>
                  <Input
                    type="text"
                    id="lastname"
                    {...register("lastname")}
                  />

                  {errors.lastname && (
                    <p className="text-destructive text-sm">
                      {errors.lastname.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="fistname"
                    className="block text-sm"
                  >
                    Tên
                  </Label>
                  <Input
                    type="text"
                    id="firstname"
                    {...register("firstname")}
                  />
                  {errors.firstname && (
                    <p className="text-destructive text-sm">
                      {errors.firstname.message}
                    </p>
                  )}
                </div>
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

              {/* email */}
              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="email"
                  className="block text-sm"
                >
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="m@gmail.com"
                  {...register("email", {
                    onBlur: (e) => {
                      if (e.target.value) {
                        checkEmailExists(e.target.value);
                      }
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                )}
                {emailError && (
                  <p className="text-destructive text-sm">{emailError}</p>
                )}
                {checkingEmail && (
                  <p className="text-muted-foreground text-sm">Đang kiểm tra email...</p>
                )}
              </div>

              {/* password */}
              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="password"
                  className="block text-sm"
                >
                  Mật khẩu
                </Label>
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

              {/* confirm password */}
              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="confirmPassword"
                  className="block text-sm"
                >
                  Xác nhận mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* nút đăng ký */}
              <Button
                type="submit"
                className="w-full px-8 py-3 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition run-cyan"
                disabled={isSubmitting}
              >
                Tạo tài khoản
              </Button>

              <div className="text-center text-sm">
                Đã có tài khoản?{" "}
                <a
                  href="/LoginPage"
                  className="underline underline-offset-4"
                >
                  Đăng nhập
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholderSignUp.png"
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