export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No Clerk auth wrapper for embed - public facing
  return <>{children}</>;
}
