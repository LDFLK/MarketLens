"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  avatarInitials?: string;
}

export default function Header({
  title,
  subtitle,
  avatarInitials = "BJ",
}: HeaderProps) {

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sticky top-0 z-40">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 ml-auto md:ml-0 w-full md:w-auto justify-end">

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-md border border-white">
          {avatarInitials}
        </div>
      </div>
    </header>
  );
}