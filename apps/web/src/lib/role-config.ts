import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MessageSquare,
  GraduationCap,
  Wallet,
  Bell,
  Settings,
  BookOpenCheck,
  FileText,
  MessagesSquare,
  ClipboardList,
  BarChart3,
  Building2,
  User as UserIcon,
} from 'lucide-react';

export type Role = 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: 'notifications';
};

export type RolePortal = {
  /** Display label used in titles / chip / breadcrumbs */
  label: string;
  /** URL root for this portal */
  path: string;
  /** Primary accent — used in brand-mark gradient, active-nav glow */
  accent: string;
  /** Secondary accent (gradient end) */
  accentGradientTo: string;
  /** ef-role-* chip class for role pills */
  chipClass: string;
  /** Where to send the user after login */
  defaultRoute: string;
  /** Sidebar items shown in this portal */
  nav: NavItem[];
};

export const ROLE_PORTAL: Record<Role, RolePortal> = {
  SUPER_ADMIN: {
    label: 'Principal',
    path: '/principal',
    accent: '#dc2626',
    accentGradientTo: '#f97316',
    chipClass: 'ef-role-admin',
    defaultRoute: '/principal/dashboard',
    nav: [
      { href: '/principal/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/principal/users',        label: 'Users',         icon: Users },
      { href: '/principal/classes',      label: 'Classes',       icon: Building2 },
      { href: '/principal/attendance',   label: 'Attendance',    icon: CalendarCheck },
      { href: '/principal/marks',        label: 'Marks',         icon: BookOpenCheck },
      { href: '/principal/timetable',    label: 'Timetable',     icon: GraduationCap },
      { href: '/principal/feed',         label: 'Class Wall',    icon: MessageSquare },
      { href: '/principal/reports',      label: 'Reports',       icon: BarChart3 },
      { href: '/principal/fees',         label: 'Fees',          icon: Wallet },
      { href: '/principal/inbox',        label: 'Inbox',         icon: Bell, badge: 'notifications' },
      { href: '/principal/settings',     label: 'Settings',      icon: Settings },
    ],
  },
  TEACHER: {
    label: 'Teacher',
    path: '/teacher',
    accent: '#d97706',
    accentGradientTo: '#eab308',
    chipClass: 'ef-role-teacher',
    defaultRoute: '/teacher/dashboard',
    nav: [
      { href: '/teacher/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/teacher/attendance',    label: 'Attendance',   icon: CalendarCheck },
      { href: '/teacher/marks',         label: 'Marks',        icon: BookOpenCheck },
      { href: '/teacher/feed',          label: 'Class Wall',   icon: MessageSquare },
      { href: '/teacher/assignments',   label: 'Assignments',  icon: ClipboardList },
      { href: '/teacher/timetable',     label: 'Timetable',    icon: GraduationCap },
      { href: '/teacher/chat',          label: 'Chat',         icon: MessagesSquare },
      { href: '/teacher/reports',       label: 'Reports',      icon: BarChart3 },
      { href: '/teacher/inbox',         label: 'Inbox',        icon: Bell, badge: 'notifications' },
    ],
  },
  STUDENT: {
    label: 'Student',
    path: '/student',
    accent: '#2563eb',
    accentGradientTo: '#14b8a6',
    chipClass: 'ef-role-student',
    defaultRoute: '/student/dashboard',
    nav: [
      { href: '/student/dashboard',    label: 'Today',          icon: LayoutDashboard },
      { href: '/student/attendance',   label: 'My Attendance',  icon: CalendarCheck },
      { href: '/student/marks',        label: 'Report Card',    icon: FileText },
      { href: '/student/timetable',    label: 'Timetable',      icon: GraduationCap },
      { href: '/student/feed',         label: 'Class Wall',     icon: MessageSquare },
      { href: '/student/assignments',  label: 'Homework',       icon: ClipboardList },
      { href: '/student/chat',         label: 'Chat',           icon: MessagesSquare },
      { href: '/student/inbox',        label: 'Inbox',          icon: Bell, badge: 'notifications' },
      { href: '/student/profile',      label: 'Profile',        icon: UserIcon },
    ],
  },
  PARENT: {
    label: 'Parent',
    path: '/parent',
    accent: '#0d9488',
    accentGradientTo: '#06b6d4',
    chipClass: 'ef-role-parent',
    defaultRoute: '/parent/dashboard',
    nav: [
      { href: '/parent/dashboard',    label: 'Overview',         icon: LayoutDashboard },
      { href: '/parent/attendance',   label: "Child's Attendance", icon: CalendarCheck },
      { href: '/parent/marks',        label: 'Report Card',      icon: FileText },
      { href: '/parent/timetable',    label: 'Timetable',        icon: GraduationCap },
      { href: '/parent/feed',         label: 'Class Wall',       icon: MessageSquare },
      { href: '/parent/assignments',  label: 'Homework',         icon: ClipboardList },
      { href: '/parent/fees',         label: 'Fees',             icon: Wallet },
      { href: '/parent/chat',         label: 'Teachers',         icon: MessagesSquare },
      { href: '/parent/inbox',        label: 'Inbox',            icon: Bell, badge: 'notifications' },
      { href: '/parent/profile',      label: 'Profile',          icon: UserIcon },
    ],
  },
};

export function portalForRole(role: string | undefined): RolePortal {
  return ROLE_PORTAL[(role as Role) ?? 'STUDENT'] ?? ROLE_PORTAL.STUDENT;
}
