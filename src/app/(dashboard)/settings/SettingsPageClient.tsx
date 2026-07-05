"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Trash2,
  Save,
  Plus,
  Loader2,
  Shield,
  Mail,
  Languages,
  Contact,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  updateClinic,
  createClinic,
  deleteClinic,
  deleteUser,
  createUser,
} from "@/actions/settings";
import {
  createReceptionist,
  renameReceptionist,
  setReceptionistActive,
} from "@/actions/receptionists";

// ==============================
// Types
// ==============================

interface ClinicData {
  id: string;
  name: string;
  phone: string | null;
  createdAt: Date;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

interface ReceptionistData {
  id: string;
  name: string;
  active: boolean;
}

interface SettingsPageClientProps {
  clinics: ClinicData[];
  users: UserData[];
  receptionists: ReceptionistData[];
  currentUserRole: UserRole;
  currentUserId: string;
}

// ==============================
// Clinic Card
// ==============================

function ClinicCard({
  clinic,
  isDoctor,
}: {
  clinic: ClinicData;
  isDoctor: boolean;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(clinic.name);
  const [phone, setPhone] = useState(clinic.phone || "");

  const hasChanges = name !== clinic.name || phone !== (clinic.phone || "");

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateClinic(clinic.id, {
          name,
          phone: phone || undefined,
        });
        toast.success(t("clinicUpdated"));
      } catch {
        toast.error(t("clinicUpdateFailed"));
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(t("deleteClinicConfirm", { name: clinic.name }))) return;
    startTransition(async () => {
      try {
        await deleteClinic(clinic.id);
        toast.success(t("clinicDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("clinicDeleteFailed"));
      }
    });
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border">
      <Building2 className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">{tCommon("name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">{tCommon("phone")}</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phoneNumber")}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("createdOn", {
              date: format.dateTime(new Date(clinic.createdAt), {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            })}
          </span>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending || !name.trim()}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin me-1" />
                ) : (
                  <Save className="h-3 w-3 me-1" />
                )}
                {tCommon("save")}
              </Button>
            )}
            {isDoctor && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================
// Add Clinic Form
// ==============================

function AddClinicForm() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createClinic({ name, phone: phone || undefined });
        toast.success(t("clinicCreated"));
        setName("");
        setPhone("");
        setShowForm(false);
      } catch {
        toast.error(t("clinicCreateFailed"));
      }
    });
  };

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 me-1" />
        {t("addClinic")}
      </Button>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-dashed space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">{t("clinicName")} *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("clinicNameExample")}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">{tCommon("phone")}</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={tCommon("optional")}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin me-1" />
          ) : (
            <Plus className="h-3 w-3 me-1" />
          )}
          {tCommon("create")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}

// ==============================
// User Row
// ==============================

function UserRow({
  user,
  isDoctor,
  isSelf,
}: {
  user: UserData;
  isDoctor: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("settings");
  const tRoles = useTranslations("roles");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      !confirm(t("deleteUserConfirm", { name: user.name, email: user.email }))
    )
      return;
    startTransition(async () => {
      try {
        await deleteUser(user.id);
        toast.success(t("userDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("userDeleteFailed"));
      }
    });
  };

  return (
    <div className="p-3 rounded-lg border space-y-2">
      {/* Top: avatar + name + delete */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary-foreground">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{user.name}</span>
            {isSelf && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {t("you")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        </div>
        {isDoctor && !isSelf && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      {/* Bottom: role + join date */}
      <div className="flex items-center gap-2 ps-12">
        <Badge
          variant={user.role === "DOCTOR" ? "default" : "secondary"}
          className="text-xs"
        >
          <Shield className="h-3 w-3 me-1" />
          {user.role === "DOCTOR" ? tRoles("DOCTOR") : tRoles("RECEPTIONIST")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("joinedOn", {
            date: format.dateTime(new Date(user.createdAt), {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          })}
        </span>
      </div>
    </div>
  );
}

// ==============================
// Add User Form (Doctor-only)
// ==============================

function AddUserForm() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("RECEPTIONIST");
  const [showForm, setShowForm] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("RECEPTIONIST");
  };

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createUser({ name, email, password, role });
        toast.success(t("userCreated"));
        reset();
        setShowForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("userCreateFailed"));
      }
    });
  };

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 me-1" />
        {t("addUser")}
      </Button>
    );
  }

  const canSubmit = name.trim() && email.trim() && password.length >= 6;

  return (
    <div className="p-4 rounded-lg border border-dashed space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">{t("userName")} *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("userNamePlaceholder")}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">{tCommon("email")} *</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("userEmailPlaceholder")}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">{t("userPassword")} *</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("userPasswordHint")}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">{t("userRole")} *</label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t("selectRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DOCTOR">{tRoles("DOCTOR")}</SelectItem>
              <SelectItem value="RECEPTIONIST">
                {tRoles("RECEPTIONIST")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isPending || !canSubmit}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin me-1" />
          ) : (
            <Plus className="h-3 w-3 me-1" />
          )}
          {tCommon("create")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setShowForm(false);
          }}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}

// ==============================
// Receptionist Row (Doctor-only)
// ==============================

function ReceptionistRow({ receptionist }: { receptionist: ReceptionistData }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(receptionist.name);

  const hasChanges = name.trim() !== receptionist.name && name.trim() !== "";

  const handleSave = () => {
    startTransition(async () => {
      try {
        await renameReceptionist(receptionist.id, name);
        toast.success(t("receptionistUpdated"));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("receptionistUpdateFailed"),
        );
      }
    });
  };

  const handleToggleActive = (active: boolean) => {
    startTransition(async () => {
      try {
        await setReceptionistActive(receptionist.id, active);
        toast.success(active ? t("receptionistEnabled") : t("receptionistDisabled"));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("receptionistUpdateFailed"),
        );
      }
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        !receptionist.active && "opacity-60",
      )}
    >
      <Contact className="h-5 w-5 text-muted-foreground shrink-0" />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm flex-1"
      />
      {hasChanges && (
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin me-1" />
          ) : (
            <Save className="h-3 w-3 me-1" />
          )}
          {tCommon("save")}
        </Button>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">
          {receptionist.active ? t("active") : t("inactive")}
        </span>
        <Switch
          checked={receptionist.active}
          onCheckedChange={handleToggleActive}
          disabled={isPending}
        />
      </div>
    </div>
  );
}

// ==============================
// Add Receptionist Form (Doctor-only)
// ==============================

function AddReceptionistForm() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createReceptionist({ name });
        toast.success(t("receptionistCreated"));
        setName("");
        setShowForm(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("receptionistCreateFailed"),
        );
      }
    });
  };

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 me-1" />
        {t("addReceptionist")}
      </Button>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-dashed space-y-3">
      <div>
        <label className="text-xs font-medium">{t("receptionistName")} *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("receptionistNamePlaceholder")}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin me-1" />
          ) : (
            <Plus className="h-3 w-3 me-1" />
          )}
          {tCommon("create")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}

// ==============================
// Main Page
// ==============================

export function SettingsPageClient({
  clinics,
  users,
  receptionists,
  currentUserRole,
  currentUserId,
}: SettingsPageClientProps) {
  const isDoctor = currentUserRole === "DOCTOR";
  const t = useTranslations("settings");
  const tLang = useTranslations("language");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Language preference */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <CardTitle className="text-base">{tLang("label")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {tLang("switchLabel")}
            </p>
            <LanguageSwitcher variant="outline" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clinics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinics">
            <Building2 className="h-4 w-4 me-1" />
            {t("clinics")}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 me-1" />
            {t("users")}
          </TabsTrigger>
          {isDoctor && (
            <TabsTrigger value="receptionists">
              <Contact className="h-4 w-4 me-1" />
              {t("receptionists")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Clinics Tab */}
        <TabsContent value="clinics">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <CardTitle>
                    {t("clinics")}
                    <span className="text-muted-foreground font-normal ms-1">
                      ({clinics.length})
                    </span>
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clinics.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  isDoctor={isDoctor}
                />
              ))}
              <AddClinicForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <CardTitle>
                  {t("userAccounts")}
                  <span className="text-muted-foreground font-normal ms-1">
                    ({users.length})
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  {t("noUsers")}
                </p>
              ) : (
                users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isDoctor={isDoctor}
                    isSelf={u.id === currentUserId}
                  />
                ))
              )}
              {isDoctor ? (
                <div className="pt-2">
                  <AddUserForm />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {t("onlyDoctorsManage")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receptionists Tab (Doctor-only) */}
        {isDoctor && (
          <TabsContent value="receptionists">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Contact className="h-4 w-4" />
                  <CardTitle>
                    {t("receptionists")}
                    <span className="text-muted-foreground font-normal ms-1">
                      ({receptionists.length})
                    </span>
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("receptionistsSubtitle")}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {receptionists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {t("noReceptionists")}
                  </p>
                ) : (
                  receptionists.map((r) => (
                    <ReceptionistRow key={r.id} receptionist={r} />
                  ))
                )}
                <div className="pt-2">
                  <AddReceptionistForm />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
