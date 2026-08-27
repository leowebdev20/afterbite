export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|api/register|auth/signin|_next/static|_next/image|favicon.ico).*)"
  ]
};
