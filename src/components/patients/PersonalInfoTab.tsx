"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { PersonalHistory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Calendar,
  Users,
  Briefcase,
  MapPin,
  Pencil,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { updatePatient } from "@/actions/patients";
import { patientDemographicsSchema, getFieldErrors } from "@/lib/validation";

interface PersonalInfoTabProps {
  history: PersonalHistory | null;
  patientId: string;
}

export function PersonalInfoTab({ history, patientId }: PersonalInfoTabProps) {
  const t = useTranslations("patientTabs.personal");
  const tField = useTranslations("patient.fields");
  const tSex = useTranslations("patient.sex");
  const tMarital = useTranslations("patient.marital");
  const tCommon = useTranslations("common");
  const formatter = useFormatter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    fullName: history?.fullName || "",
    phoneNumber: history?.phoneNumber || "",
    dateOfBirth: history?.dateOfBirth
      ? format(new Date(history.dateOfBirth), "yyyy-MM-dd")
      : "",
    sex: history?.sex || "",
    maritalStatus: history?.maritalStatus || "",
    offsprings: history?.offsprings?.toString() || "",
    occupation: history?.occupation || "",
    residence: history?.residence || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!history) return null;

  const handleSave = () => {
    const result = patientDemographicsSchema.safeParse({
      fullName: formData.fullName,
      offsprings: formData.offsprings,
    });
    const fieldErrors = getFieldErrors(result);
    setErrors(fieldErrors);
    if (!result.success) return;
    startTransition(async () => {
      try {
        await updatePatient(patientId, {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth || undefined,
          sex: formData.sex || undefined,
          maritalStatus: formData.maritalStatus || undefined,
          offsprings: formData.offsprings
            ? parseInt(formData.offsprings)
            : undefined,
          occupation: formData.occupation || undefined,
          residence: formData.residence || undefined,
        });
        toast.success(t("updated"));
        setIsEditing(false);
      } catch {
        toast.error(t("updateFailed"));
      }
    });
  };

  const handleCancel = () => {
    setFormData({
      fullName: history?.fullName || "",
      phoneNumber: history?.phoneNumber || "",
      dateOfBirth: history?.dateOfBirth
        ? format(new Date(history.dateOfBirth), "yyyy-MM-dd")
        : "",
      sex: history?.sex || "",
      maritalStatus: history?.maritalStatus || "",
      offsprings: history?.offsprings?.toString() || "",
      occupation: history?.occupation || "",
      residence: history?.residence || "",
    });
    setIsEditing(false);
    setErrors({});
  };

  const localizedSex = history.sex
    ? tSex.has(history.sex)
      ? tSex(history.sex)
      : history.sex
    : null;
  const localizedMarital = history.maritalStatus
    ? tMarital.has(history.maritalStatus)
      ? tMarital(history.maritalStatus)
      : history.maritalStatus
    : null;

  const fields = [
    {
      icon: Calendar,
      label: tField("dateOfBirth"),
      value: history.dateOfBirth
        ? formatter.dateTime(new Date(history.dateOfBirth), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null,
    },
    { icon: User, label: tField("sex"), value: localizedSex },
    {
      icon: Users,
      label: tField("maritalStatus"),
      value: localizedMarital,
    },
    {
      icon: Users,
      label: tField("children"),
      value: history.offsprings?.toString(),
    },
    { icon: Briefcase, label: tField("occupation"), value: history.occupation },
    { icon: MapPin, label: tField("residence"), value: history.residence },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("title")}</CardTitle>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 me-2" />
            {tCommon("edit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 me-2" />
              {tCommon("cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {tCommon("save")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("fullName")}
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("phoneNumber")}
              </label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("dateOfBirth")}
              </label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("sex")}
              </label>
              <Select
                value={formData.sex}
                onValueChange={(value) =>
                  setFormData({ ...formData, sex: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{tSex("male")}</SelectItem>
                  <SelectItem value="female">{tSex("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("maritalStatus")}
              </label>
              <Select
                value={formData.maritalStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, maritalStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{tMarital("single")}</SelectItem>
                  <SelectItem value="married">{tMarital("married")}</SelectItem>
                  <SelectItem value="divorced">
                    {tMarital("divorced")}
                  </SelectItem>
                  <SelectItem value="widowed">{tMarital("widowed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("children")}
              </label>
              <Input
                type="number"
                min="0"
                value={formData.offsprings}
                onChange={(e) =>
                  setFormData({ ...formData, offsprings: e.target.value })
                }
                className={errors.offsprings ? "border-destructive" : ""}
              />
              {errors.offsprings && (
                <p className="text-sm text-destructive mt-1">
                  {errors.offsprings}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("occupation")}
              </label>
              <Input
                value={formData.occupation}
                onChange={(e) =>
                  setFormData({ ...formData, occupation: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tField("residence")}
              </label>
              <Input
                value={formData.residence}
                onChange={(e) =>
                  setFormData({ ...formData, residence: e.target.value })
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fields.map(
              (field) =>
                field.value && (
                  <div key={field.label} className="flex items-start gap-2">
                    <field.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {field.label}
                      </p>
                      <p className="font-medium capitalize">{field.value}</p>
                    </div>
                  </div>
                ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
