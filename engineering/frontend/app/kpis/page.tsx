"use client";

import { useState, type FormEvent } from "react";
import Header from "@/components/layout/Header";
import type { HierarchyRow } from "@/types/kpi";
import {
  useEmploymentSectors, useCreateEmploymentSector, useUpdateEmploymentSector, useDeleteEmploymentSector,
  useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience,
  useEducationLevels, useCreateEducationLevel, useUpdateEducationLevel, useDeleteEducationLevel,
  useFormalities, useCreateFormality, useUpdateFormality, useDeleteFormality,
  useGenders, useCreateGender, useUpdateGender, useDeleteGender,
  useVocationalEducations, useCreateVocationalEducation, useUpdateVocationalEducation, useDeleteVocationalEducation,

  useMajorGroups, useCreateMajorGroup, useUpdateMajorGroup, useDeleteMajorGroup,
  useSubMajorGroups, useCreateSubMajorGroup, useUpdateSubMajorGroup, useDeleteSubMajorGroup,
  useMinorGroups, useCreateMinorGroup, useUpdateMinorGroup, useDeleteMinorGroup,
  useUnitGroups, useCreateUnitGroup, useUpdateUnitGroup, useDeleteUnitGroup,
  useOccupationGroups, useCreateOccupationGroup, useUpdateOccupationGroup, useDeleteOccupationGroup,

  useIndustrySectors, useCreateIndustrySector, useUpdateIndustrySector, useDeleteIndustrySector,
  useIndustryDivisions, useCreateIndustryDivision, useUpdateIndustryDivision, useDeleteIndustryDivision,
  useIndustryGroups, useCreateIndustryGroup, useUpdateIndustryGroup, useDeleteIndustryGroup,
  useIndustryClasses, useCreateIndustryClass, useUpdateIndustryClass, useDeleteIndustryClass,
  useIndustrySubclasses, useCreateIndustrySubclass, useUpdateIndustrySubclass, useDeleteIndustrySubclass,
} from "@/hooks/use-kpi";


// CATEGORY CONFIG — flat KPIs (Remote/On-Site and Contract Type intentionally
// removed per requirements — not present anywhere below).
type KPICategoryKey =
  | "employmentSector"
  | "experience"
  | "educationLevel"
  | "formalInformal"
  | "gender"
  | "vocationalEducation";

type KPICategoryConfig = {
  title: string;
  description: string;
  itemLabel: string;
  accent: string;
};

const KPI_CATEGORIES: Record<KPICategoryKey, KPICategoryConfig> = {
  employmentSector: {
    title: "Employment Sector",
    description: "Government, Semi-Government, Private and NGO sector breakdown",
    itemLabel: "Sector",
    accent: "blue",
  },
  experience: {
    title: "Experience",
    description: "Experience breakdown used for job categrization",
    itemLabel: "Experience Level",
    accent: "amber",
  },
  educationLevel: {
    title: "Education Level",
    description: "Academic qualification levels",
    itemLabel: "Education Level",
    accent: "violet",
  },
  formalInformal: {
    title: "Formal / Informal",
    description: "Formal vs. informal sector classification",
    itemLabel: "Type",
    accent: "emerald",
  },
  gender: {
    title: "Gender",
    description: "Gender breakdown of the vacancies",
    itemLabel: "Gender",
    accent: "pink",
  },
  vocationalEducation: {
    title: "Vocational Education (NVQ)",
    description: "National Vocational Qualification levels",
    itemLabel: "NVQ Level",
    accent: "indigo",
  },
};

const CATEGORY_ORDER: KPICategoryKey[] = [
  "employmentSector",
  "experience",
  "educationLevel",
  "formalInformal",
  "gender",
  "vocationalEducation",
];


// HIERARCHY CONFIG — Occupation + Industry, top level -> leaf level
// (unchanged from the original design — just now backed by real data)
type HierarchyId = "occupation" | "industry";

type HierarchyLevelDef = {
  key: string;
  title: string;
  itemLabel: string;
};

type HierarchyDef = {
  label: string;
  accent: string;
  levels: HierarchyLevelDef[];
};

const HIERARCHY_ORDER: HierarchyId[] = ["occupation", "industry"];

const HIERARCHIES: Record<HierarchyId, HierarchyDef> = {
  occupation: {
    label: "Occupation",
    accent: "rose",
    levels: [
      { key: "majorGroup", title: "Major Group", itemLabel: "Major Group" },
      { key: "subMajorGroup", title: "Sub Major Group", itemLabel: "Sub Major Group" },
      { key: "minorGroup", title: "Minor Group", itemLabel: "Minor Group" },
      { key: "unitGroup", title: "Unit Group", itemLabel: "Unit Group" },
      { key: "occupationGroup", title: "Occupation Group", itemLabel: "Occupation Group" },
    ],
  },
  industry: {
    label: "Industry",
    accent: "orange",
    levels: [
      { key: "sector", title: "Industry Sector", itemLabel: "Industry Sector" },
      { key: "division", title: "Industry Division", itemLabel: "Industry Division" },
      { key: "group", title: "Industry Group", itemLabel: "Industry Group" },
      { key: "class", title: "Industry Class", itemLabel: "Industry Class" },
      { key: "subClass", title: "Industry Sub Class", itemLabel: "Industry Sub Class" },
    ],
  },
};


// ACCENT COLOR CLASS MAP (Tailwind needs literal class names, not template strings)
const ACCENT_CLASSES: Record<string, { bg: string; text: string; ring: string; solidBg: string; lightBg: string }> = {
  blue: { bg: "bg-blue-600", text: "text-blue-600", ring: "ring-blue-500", solidBg: "bg-blue-600", lightBg: "bg-blue-50" },
  amber: { bg: "bg-amber-600", text: "text-amber-600", ring: "ring-amber-500", solidBg: "bg-amber-500", lightBg: "bg-amber-50" },
  violet: { bg: "bg-violet-600", text: "text-violet-600", ring: "ring-violet-500", solidBg: "bg-violet-600", lightBg: "bg-violet-50" },
  emerald: { bg: "bg-emerald-600", text: "text-emerald-600", ring: "ring-emerald-500", solidBg: "bg-emerald-600", lightBg: "bg-emerald-50" },
  pink: { bg: "bg-pink-600", text: "text-pink-600", ring: "ring-pink-500", solidBg: "bg-pink-600", lightBg: "bg-pink-50" },
  indigo: { bg: "bg-indigo-600", text: "text-indigo-600", ring: "ring-indigo-500", solidBg: "bg-indigo-600", lightBg: "bg-indigo-50" },
  rose: { bg: "bg-rose-600", text: "text-rose-600", ring: "ring-rose-500", solidBg: "bg-rose-600", lightBg: "bg-rose-50" },
  orange: { bg: "bg-orange-600", text: "text-orange-600", ring: "ring-orange-500", solidBg: "bg-orange-600", lightBg: "bg-orange-50" },
};


// HIERARCHY ROW NORMALIZERS
// Each raw API type has a different label/parent field name; these adapt
// every level down to one common shape (HierarchyRow) so the table/form JSX
// below only needs to be written once instead of ten times.
function normTop(list: { id: number; name: string; code: string }[] | undefined): HierarchyRow[] {
  return (list ?? []).map((i) => ({ id: i.id, name: i.name, code: i.code, parentId: null, parentLabel: null }));
}

function normChild(list: unknown[] | undefined, parentIdField: string, parentField: string): HierarchyRow[] {
  return (list ?? []).map((raw) => {
    const item = raw as Record<string, unknown>;
    const parentId = item[parentIdField] as number;
    const parent = item[parentField] as { name: string; code: string } | null;
    return {
      id: item.id as number,
      name: item.name as string,
      code: item.code as string,
      parentId,
      parentLabel: parent ? `${parent.code} — ${parent.name}` : null,
    };
  });
}


// GENERIC BUNDLE SHAPES
// Deliberately loosely typed (payload: any) — six flat KPIs and ten hierarchy
// levels each have a different payload shape server-side, and collapsing
// them into one generic table/form means the container has to erase those
// specific types. Each concrete hook still enforces its own payload type at
// the call site above (useCreateEmploymentSector, etc.) — only the bundle
// wiring below loses that specificity, by design.
interface MutationLike<TVars> {
  mutate: (vars: TVars, opts?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => void;
  isPending: boolean;
}

interface FlatBundle {
  isLoading: boolean;
  isError: boolean;
  items: { id: number; label: string }[];
  createMut: MutationLike<any>;
  updateMut: MutationLike<{ id: number; payload: any }>;
  deleteMut: MutationLike<number>;
  labelField: string;
}

interface HierarchyLevelBundle {
  isLoading: boolean;
  isError: boolean;
  items: HierarchyRow[];
  createMut: MutationLike<any>;
  updateMut: MutationLike<{ id: number; payload: any }>;
  deleteMut: MutationLike<number>;
  parentField: string | null; // e.g. "major_group_id", null for the top level
  total?: number;
  page?: number;
  setPage?: (p: number) => void;
}

type SectionKey = "flat" | HierarchyId;

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function ManageKpisPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("flat");

  // FLAT KPI HOOKS — called unconditionally, all 6, every render (Rules of
  // Hooks). Which one is "active" is decided afterwards via flatBundles.
  const employmentSectorsQ = useEmploymentSectors();
  const createEmploymentSector = useCreateEmploymentSector();
  const updateEmploymentSector = useUpdateEmploymentSector();
  const deleteEmploymentSector = useDeleteEmploymentSector();

  const experiencesQ = useExperiences();
  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();

  const educationLevelsQ = useEducationLevels();
  const createEducationLevel = useCreateEducationLevel();
  const updateEducationLevel = useUpdateEducationLevel();
  const deleteEducationLevel = useDeleteEducationLevel();

  const formalitiesQ = useFormalities();
  const createFormality = useCreateFormality();
  const updateFormality = useUpdateFormality();
  const deleteFormality = useDeleteFormality();

  const gendersQ = useGenders();
  const createGender = useCreateGender();
  const updateGender = useUpdateGender();
  const deleteGender = useDeleteGender();

  const vocationalEducationsQ = useVocationalEducations();
  const createVocationalEducation = useCreateVocationalEducation();
  const updateVocationalEducation = useUpdateVocationalEducation();
  const deleteVocationalEducation = useDeleteVocationalEducation();

  const flatBundles: Record<KPICategoryKey, FlatBundle> = {
    employmentSector: {
      isLoading: employmentSectorsQ.isLoading,
      isError: employmentSectorsQ.isError,
      items: (employmentSectorsQ.data?.employment_sectors ?? []).map((e) => ({ id: e.id, label: e.sector })),
      createMut: createEmploymentSector,
      updateMut: updateEmploymentSector,
      deleteMut: deleteEmploymentSector,
      labelField: "sector",
    },
    experience: {
      isLoading: experiencesQ.isLoading,
      isError: experiencesQ.isError,
      items: (experiencesQ.data?.experiences ?? []).map((e) => ({ id: e.id, label: e.name })),
      createMut: createExperience,
      updateMut: updateExperience,
      deleteMut: deleteExperience,
      labelField: "name",
    },
    educationLevel: {
      isLoading: educationLevelsQ.isLoading,
      isError: educationLevelsQ.isError,
      items: (educationLevelsQ.data?.education_levels ?? []).map((e) => ({ id: e.id, label: e.level })),
      createMut: createEducationLevel,
      updateMut: updateEducationLevel,
      deleteMut: deleteEducationLevel,
      labelField: "level",
    },
    formalInformal: {
      isLoading: formalitiesQ.isLoading,
      isError: formalitiesQ.isError,
      items: (formalitiesQ.data?.formalities ?? []).map((f) => ({ id: f.id, label: f.formality_type })),
      createMut: createFormality,
      updateMut: updateFormality,
      deleteMut: deleteFormality,
      labelField: "formality_type",
    },
    gender: {
      isLoading: gendersQ.isLoading,
      isError: gendersQ.isError,
      items: (gendersQ.data?.genders ?? []).map((g) => ({ id: g.id, label: g.gender_type })),
      createMut: createGender,
      updateMut: updateGender,
      deleteMut: deleteGender,
      labelField: "gender_type",
    },
    vocationalEducation: {
      isLoading: vocationalEducationsQ.isLoading,
      isError: vocationalEducationsQ.isError,
      items: (vocationalEducationsQ.data?.vocational_educations ?? []).map((v) => ({ id: v.id, label: v.level })),
      createMut: createVocationalEducation,
      updateMut: updateVocationalEducation,
      deleteMut: deleteVocationalEducation,
      labelField: "level",
    },
  };

  const [activeCategory, setActiveCategory] = useState<KPICategoryKey>("employmentSector");
  const config = KPI_CATEGORIES[activeCategory];
  const accent = ACCENT_CLASSES[config.accent];
  const bundle = flatBundles[activeCategory];
  const items = bundle.items;

  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function switchCategory(cat: KPICategoryKey) {
    setActiveSection("flat");
    setActiveCategory(cat);
    setEditingId(null);
    setEditError(null);
    setFormError(null);
    setNewName("");
  }

  // CREATE 
  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError(`${config.itemLabel} name is required.`);
      return;
    }
    setFormError(null);
    bundle.createMut.mutate(
      { [bundle.labelField]: trimmed },
      {
        onSuccess: () => {
          setNewName("");
          flashToast(`Added "${trimmed}"`);
        },
        onError: (err) => setFormError(errMsg(err, "Failed to create item.")),
      }
    );
  }

  // UPDATE 
  function startEdit(item: { id: number; label: string }) {
    setEditingId(item.id);
    setEditName(item.label);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function saveEdit(id: number) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(`${config.itemLabel} name is required.`);
      return;
    }
    bundle.updateMut.mutate(
      { id, payload: { [bundle.labelField]: trimmed } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditError(null);
          flashToast(`Updated "${trimmed}"`);
        },
        onError: (err) => setEditError(errMsg(err, "Failed to update item.")),
      }
    );
  }

  // DELETE 
  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    bundle.deleteMut.mutate(target.id, {
      onSuccess: () => {
        flashToast(`Deleted "${target.label}"`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        flashToast(errMsg(err, "Failed to delete item."));
        setDeleteTarget(null);
      },
    });
  }


  // HIERARCHICAL KPI HOOKS — all 10 levels called unconditionally, every
  // render. Occupation branch:
  const PAGE_SIZE = 20;
  const [occGroupPage, setOccGroupPage] = useState(1);
  const [indSubclassPage, setIndSubclassPage] = useState(1);

  const majorGroupsQ = useMajorGroups();
  const createMajorGroup = useCreateMajorGroup();
  const updateMajorGroup = useUpdateMajorGroup();
  const deleteMajorGroup = useDeleteMajorGroup();

  const subMajorGroupsQ = useSubMajorGroups();
  const createSubMajorGroup = useCreateSubMajorGroup();
  const updateSubMajorGroup = useUpdateSubMajorGroup();
  const deleteSubMajorGroup = useDeleteSubMajorGroup();

  const minorGroupsQ = useMinorGroups();
  const createMinorGroup = useCreateMinorGroup();
  const updateMinorGroup = useUpdateMinorGroup();
  const deleteMinorGroup = useDeleteMinorGroup();

  const unitGroupsQ = useUnitGroups();
  const createUnitGroup = useCreateUnitGroup();
  const updateUnitGroup = useUpdateUnitGroup();
  const deleteUnitGroup = useDeleteUnitGroup();

  const occupationGroupsQ = useOccupationGroups(PAGE_SIZE, (occGroupPage - 1) * PAGE_SIZE);
  const createOccupationGroup = useCreateOccupationGroup();
  const updateOccupationGroup = useUpdateOccupationGroup();
  const deleteOccupationGroup = useDeleteOccupationGroup();

  // Industry branch:
  const industrySectorsQ = useIndustrySectors();
  const createIndustrySector = useCreateIndustrySector();
  const updateIndustrySector = useUpdateIndustrySector();
  const deleteIndustrySector = useDeleteIndustrySector();

  const industryDivisionsQ = useIndustryDivisions();
  const createIndustryDivision = useCreateIndustryDivision();
  const updateIndustryDivision = useUpdateIndustryDivision();
  const deleteIndustryDivision = useDeleteIndustryDivision();

  const industryGroupsQ = useIndustryGroups();
  const createIndustryGroup = useCreateIndustryGroup();
  const updateIndustryGroup = useUpdateIndustryGroup();
  const deleteIndustryGroup = useDeleteIndustryGroup();

  const industryClassesQ = useIndustryClasses();
  const createIndustryClass = useCreateIndustryClass();
  const updateIndustryClass = useUpdateIndustryClass();
  const deleteIndustryClass = useDeleteIndustryClass();

  const industrySubclassesQ = useIndustrySubclasses(PAGE_SIZE, (indSubclassPage - 1) * PAGE_SIZE);
  const createIndustrySubclass = useCreateIndustrySubclass();
  const updateIndustrySubclass = useUpdateIndustrySubclass();
  const deleteIndustrySubclass = useDeleteIndustrySubclass();

  const hierarchyBundles: Record<HierarchyId, HierarchyLevelBundle[]> = {
    occupation: [
      {
        isLoading: majorGroupsQ.isLoading,
        isError: majorGroupsQ.isError,
        items: normTop(majorGroupsQ.data?.major_groups),
        createMut: createMajorGroup,
        updateMut: updateMajorGroup,
        deleteMut: deleteMajorGroup,
        parentField: null,
      },
      {
        isLoading: subMajorGroupsQ.isLoading,
        isError: subMajorGroupsQ.isError,
        items: normChild(subMajorGroupsQ.data?.sub_major_groups, "major_group_id", "major_group"),
        createMut: createSubMajorGroup,
        updateMut: updateSubMajorGroup,
        deleteMut: deleteSubMajorGroup,
        parentField: "major_group_id",
      },
      {
        isLoading: minorGroupsQ.isLoading,
        isError: minorGroupsQ.isError,
        items: normChild(minorGroupsQ.data?.minor_groups, "sub_major_group_id", "sub_major_group"),
        createMut: createMinorGroup,
        updateMut: updateMinorGroup,
        deleteMut: deleteMinorGroup,
        parentField: "sub_major_group_id",
      },
      {
        isLoading: unitGroupsQ.isLoading,
        isError: unitGroupsQ.isError,
        items: normChild(unitGroupsQ.data?.unit_groups, "minor_group_id", "minor_group"),
        createMut: createUnitGroup,
        updateMut: updateUnitGroup,
        deleteMut: deleteUnitGroup,
        parentField: "minor_group_id",
      },
      {
        isLoading: occupationGroupsQ.isLoading,
        isError: occupationGroupsQ.isError,
        items: normChild(occupationGroupsQ.data?.occupation_groups, "unit_group_id", "unit_group"),
        createMut: createOccupationGroup,
        updateMut: updateOccupationGroup,
        deleteMut: deleteOccupationGroup,
        parentField: "unit_group_id",
        total: occupationGroupsQ.data?.total,
        page: occGroupPage,
        setPage: setOccGroupPage,
      },
    ],
    industry: [
      {
        isLoading: industrySectorsQ.isLoading,
        isError: industrySectorsQ.isError,
        items: normTop(industrySectorsQ.data?.industry_sectors),
        createMut: createIndustrySector,
        updateMut: updateIndustrySector,
        deleteMut: deleteIndustrySector,
        parentField: null,
      },
      {
        isLoading: industryDivisionsQ.isLoading,
        isError: industryDivisionsQ.isError,
        items: normChild(industryDivisionsQ.data?.industry_divisions, "industry_sector_id", "industry_sector"),
        createMut: createIndustryDivision,
        updateMut: updateIndustryDivision,
        deleteMut: deleteIndustryDivision,
        parentField: "industry_sector_id",
      },
      {
        isLoading: industryGroupsQ.isLoading,
        isError: industryGroupsQ.isError,
        items: normChild(industryGroupsQ.data?.industry_groups, "industry_division_id", "industry_division"),
        createMut: createIndustryGroup,
        updateMut: updateIndustryGroup,
        deleteMut: deleteIndustryGroup,
        parentField: "industry_division_id",
      },
      {
        isLoading: industryClassesQ.isLoading,
        isError: industryClassesQ.isError,
        items: normChild(industryClassesQ.data?.industry_classes, "industry_group_id", "industry_group"),
        createMut: createIndustryClass,
        updateMut: updateIndustryClass,
        deleteMut: deleteIndustryClass,
        parentField: "industry_group_id",
      },
      {
        isLoading: industrySubclassesQ.isLoading,
        isError: industrySubclassesQ.isError,
        items: normChild(industrySubclassesQ.data?.industry_subclasses, "industry_class_id", "industry_class"),
        createMut: createIndustrySubclass,
        updateMut: updateIndustrySubclass,
        deleteMut: deleteIndustrySubclass,
        parentField: "industry_class_id",
        total: industrySubclassesQ.data?.total,
        page: indSubclassPage,
        setPage: setIndSubclassPage,
      },
    ],
  };

  const [hActiveLevelIndex, setHActiveLevelIndex] = useState(0);

  const [hNewName, setHNewName] = useState("");
  const [hNewCode, setHNewCode] = useState("");
  const [hNewParentId, setHNewParentId] = useState("");
  const [hFormError, setHFormError] = useState<string | null>(null);

  const [hEditingId, setHEditingId] = useState<number | null>(null);
  const [hEditName, setHEditName] = useState("");
  const [hEditCode, setHEditCode] = useState("");
  const [hEditParentId, setHEditParentId] = useState("");
  const [hEditError, setHEditError] = useState<string | null>(null);

  const [hDeleteTarget, setHDeleteTarget] = useState<HierarchyRow | null>(null);

  const isHierarchySection = activeSection === "occupation" || activeSection === "industry";
  const hierarchyId: HierarchyId | null = isHierarchySection ? (activeSection as HierarchyId) : null;
  const hierarchyDef = hierarchyId ? HIERARCHIES[hierarchyId] : null;
  const hAccent = hierarchyDef ? ACCENT_CLASSES[hierarchyDef.accent] : ACCENT_CLASSES.rose;
  const hLevels = hierarchyDef ? hierarchyDef.levels : [];
  const hLevelDef = hierarchyDef ? hLevels[hActiveLevelIndex] : null;
  const hParentLevelDef = hierarchyDef && hActiveLevelIndex > 0 ? hLevels[hActiveLevelIndex - 1] : null;

  const hLevelBundle = hierarchyId ? hierarchyBundles[hierarchyId][hActiveLevelIndex] : null;
  const hParentBundle = hierarchyId && hActiveLevelIndex > 0 ? hierarchyBundles[hierarchyId][hActiveLevelIndex - 1] : null;

  const hItems = hLevelBundle?.items ?? [];
  const hParentItems = hParentBundle?.items ?? [];

  function hierarchyTotalCount(id: HierarchyId): number {
    return hierarchyBundles[id].reduce((sum, lvl) => sum + lvl.items.length, 0);
  }

  function hParentDisplay(item: HierarchyRow): string {
    return item.parentLabel ?? "—";
  }

  function resetHForms() {
    setHEditingId(null);
    setHEditError(null);
    setHFormError(null);
    setHNewName("");
    setHNewCode("");
    setHNewParentId("");
  }

  function switchHierarchy(id: HierarchyId) {
    setActiveSection(id);
    setHActiveLevelIndex(0);
    resetHForms();
  }

  function switchHLevel(index: number) {
    setHActiveLevelIndex(index);
    resetHForms();
  }

  // CREATE 
  function handleHAdd(e: FormEvent) {
    e.preventDefault();
    if (!hierarchyId || !hLevelDef || !hLevelBundle) return;

    const trimmedName = hNewName.trim();
    const trimmedCode = hNewCode.trim();

    if (!trimmedName) {
      setHFormError(`${hLevelDef.itemLabel} name is required.`);
      return;
    }
    if (!trimmedCode) {
      setHFormError(`${hLevelDef.itemLabel} code is required.`);
      return;
    }
    if (hParentLevelDef && !hNewParentId) {
      setHFormError(`Select a parent ${hParentLevelDef.itemLabel}.`);
      return;
    }
    setHFormError(null);

    const payload: Record<string, unknown> = { name: trimmedName, code: trimmedCode };
    if (hLevelBundle.parentField) {
      payload[hLevelBundle.parentField] = Number(hNewParentId);
    }

    hLevelBundle.createMut.mutate(payload, {
      onSuccess: () => {
        setHNewName("");
        setHNewCode("");
        setHNewParentId("");
        flashToast(`Added "${trimmedName}"`);
      },
      onError: (err) => setHFormError(errMsg(err, "Failed to create item.")),
    });
  }

  // UPDATE 
  function startHEdit(item: HierarchyRow) {
    setHEditingId(item.id);
    setHEditName(item.name);
    setHEditCode(item.code);
    setHEditParentId(item.parentId != null ? String(item.parentId) : "");
    setHEditError(null);
  }

  function cancelHEdit() {
    setHEditingId(null);
    setHEditError(null);
  }

  function saveHEdit(id: number) {
    if (!hierarchyId || !hLevelDef || !hLevelBundle) return;

    const trimmedName = hEditName.trim();
    const trimmedCode = hEditCode.trim();

    if (!trimmedName) {
      setHEditError(`${hLevelDef.itemLabel} name is required.`);
      return;
    }
    if (!trimmedCode) {
      setHEditError(`${hLevelDef.itemLabel} code is required.`);
      return;
    }
    if (hParentLevelDef && !hEditParentId) {
      setHEditError(`Select a parent ${hParentLevelDef.itemLabel}.`);
      return;
    }

    const payload: Record<string, unknown> = { name: trimmedName, code: trimmedCode };
    if (hLevelBundle.parentField) {
      payload[hLevelBundle.parentField] = Number(hEditParentId);
    }

    hLevelBundle.updateMut.mutate(
      { id, payload },
      {
        onSuccess: () => {
          setHEditingId(null);
          setHEditError(null);
          flashToast(`Updated "${trimmedName}"`);
        },
        onError: (err) => setHEditError(errMsg(err, "Failed to update item.")),
      }
    );
  }

  // DELETE 
  // Note: the DB has ON DELETE CASCADE on every level's parent_id foreign
  // key, so deleting a row here removes all its descendants server-side
  // automatically — the delete hooks (see hooks/use-kpi.ts) already
  // invalidate every level's cache for this hierarchy as a result.
  function handleHDelete() {
    if (!hLevelBundle || !hDeleteTarget) return;
    const target = hDeleteTarget;
    hLevelBundle.deleteMut.mutate(target.id, {
      onSuccess: () => {
        flashToast(`Deleted "${target.name}"`);
        setHDeleteTarget(null);
      },
      onError: (err) => {
        flashToast(errMsg(err, "Failed to delete item."));
        setHDeleteTarget(null);
      },
    });
  }

  function countHierarchyDescendants(id: HierarchyId, levelIndex: number, targetId: number): number {
    const levels = hierarchyBundles[id];
    if (levelIndex === levels.length - 1) return 0;
    const childItems = levels[levelIndex + 1].items.filter((c) => c.parentId === targetId);
    return childItems.reduce(
      (sum, child) => sum + 1 + countHierarchyDescendants(id, levelIndex + 1, child.id),
      0
    );
  }

  const hDeleteDescendantCount =
    hierarchyId && hDeleteTarget ? countHierarchyDescendants(hierarchyId, hActiveLevelIndex, hDeleteTarget.id) : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <Header
        title="KPI Reference Data Manager"
        subtitle="Create, edit, and remove the reference values that power the labour market dashboard charts"
      />

      <div className="flex">
        {/* LEFT: CATEGORY NAV */}
        <aside className="w-72 min-w-72 border-r border-gray-100 bg-white h-[calc(100vh-89px)] overflow-y-auto sticky top-[89px] py-4 px-3 space-y-1">
          {CATEGORY_ORDER.map((key) => {
            const cfg = KPI_CATEGORIES[key];
            const acc = ACCENT_CLASSES[cfg.accent];
            const count = flatBundles[key].items.length;
            const isActive = activeSection === "flat" && activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => switchCategory(key)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-2 ${
                  isActive ? `${acc.lightBg} ring-1 ${acc.ring}` : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className={`text-xs font-bold ${isActive ? acc.text : "text-gray-700"}`}>{cfg.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} items</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? acc.solidBg : "bg-gray-200"}`} />
              </button>
            );
          })}

          <div className="pt-3 mt-2 border-t border-gray-100">
            <p className="px-4 pb-1.5 text-[10px] font-black uppercase text-gray-300 tracking-wider">
              Hierarchical
            </p>
            {HIERARCHY_ORDER.map((id) => {
              const def = HIERARCHIES[id];
              const acc = ACCENT_CLASSES[def.accent];
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => switchHierarchy(id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-2 ${
                    isActive ? `${acc.lightBg} ring-1 ${acc.ring}` : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-xs font-bold ${isActive ? acc.text : "text-gray-700"}`}>{def.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {hierarchyTotalCount(id)} items · {def.levels.length} levels
                    </p>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? acc.solidBg : "bg-gray-200"}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: CRUD WORKSPACE */}
        {activeSection === "flat" ? (
          <main className="flex-1 p-8 max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-900">{config.title}</h2>
              <p className="text-xs text-gray-400 mt-1">{config.description}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm w-fit min-w-[200px]">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{items.length}</p>
            </div>

            {bundle.isError && (
              <p className="text-xs font-bold text-red-500">
                Failed to load {config.title.toLowerCase()}. Please refresh.
              </p>
            )}

            <form
              onSubmit={handleAdd}
              className="bg-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end"
            >
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                  {config.itemLabel}
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`e.g. New ${config.itemLabel}`}
                  className="w-full bg-gray-50 rounded-lg p-2.5 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                />
              </div>
              <button
                type="submit"
                disabled={bundle.createMut.isPending}
                className={`${accent.bg} text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shrink-0 disabled:opacity-50`}
              >
                {bundle.createMut.isPending ? "Adding..." : `+ Add ${config.itemLabel}`}
              </button>
            </form>
            {formError && <p className="text-[11px] font-bold text-red-500 -mt-3 px-1">{formError}</p>}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="text-left px-5 py-3">{config.itemLabel}</th>
                    <th className="text-right px-5 py-3 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.isLoading && (
                    <tr>
                      <td colSpan={2} className="px-5 py-10 text-center text-gray-400 font-medium">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!bundle.isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-5 py-10 text-center text-gray-400 font-medium">
                        No items yet — add the first {config.itemLabel.toLowerCase()} above.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-3 align-top">
                          {isEditing ? (
                            <>
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-gray-50 rounded-lg p-2 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                                autoFocus
                              />
                              {editError && <p className="text-[10px] font-bold text-red-500 mt-1">{editError}</p>}
                            </>
                          ) : (
                            <span className="font-bold text-gray-800">{item.label}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(item.id)}
                                  disabled={bundle.updateMut.isPending}
                                  className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                  {bundle.updateMut.isPending ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(item)}
                                  className={`text-[11px] font-bold ${accent.text} ${accent.lightBg} hover:opacity-80 px-3 py-1.5 rounded-lg transition-all`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(item)}
                                  className="text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </main>
        ) : hierarchyDef && hLevelDef && hLevelBundle ? (
          <main className="flex-1 p-8 max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-900">{hierarchyDef.label} Classification</h2>
              <p className="text-xs text-gray-400 mt-1">
                {hierarchyDef.levels.map((l) => l.title).join(" → ")}. Each item has a name, a code, and
                (except the top level) a parent from the level above.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {hierarchyDef.levels.map((level, idx) => {
                const isActive = hActiveLevelIndex === idx;
                const count = hierarchyBundles[hierarchyId as HierarchyId][idx].items.length;
                return (
                  <button
                    key={level.key}
                    onClick={() => switchHLevel(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive ? `${hAccent.solidBg} text-white` : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                        isActive ? "bg-white/20" : "bg-gray-100"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    {level.title}
                    <span className={isActive ? "text-white/70" : "text-gray-300"}>({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm w-fit min-w-[200px]">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                Total {hLevelDef.title} Items
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">{hItems.length}</p>
            </div>

            {hLevelBundle.isError && (
              <p className="text-xs font-bold text-red-500">
                Failed to load {hLevelDef.title.toLowerCase()} data. Please refresh.
              </p>
            )}

            <form
              onSubmit={handleHAdd}
              className="bg-white p-5 rounded-xl shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end sm:flex-wrap"
            >
              <div className="flex-1 min-w-[160px]">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                  {hLevelDef.itemLabel} Name
                </label>
                <input
                  value={hNewName}
                  onChange={(e) => setHNewName(e.target.value)}
                  placeholder={`e.g. New ${hLevelDef.itemLabel}`}
                  className="w-full bg-gray-50 rounded-lg p-2.5 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                  Code
                </label>
                <input
                  value={hNewCode}
                  onChange={(e) => setHNewCode(e.target.value)}
                  placeholder="e.g. 1112"
                  className="w-full bg-gray-50 rounded-lg p-2.5 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                />
              </div>
              {hParentLevelDef && (
                <div className="w-full sm:w-64">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                    Parent {hParentLevelDef.itemLabel}
                  </label>
                  <select
                    value={hNewParentId}
                    onChange={(e) => setHNewParentId(e.target.value)}
                    className="w-full bg-gray-50 rounded-lg p-2.5 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                  >
                    <option value="">Select {hParentLevelDef.itemLabel}…</option>
                    {hParentItems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                disabled={hLevelBundle.createMut.isPending}
                className={`${hAccent.bg} text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shrink-0 disabled:opacity-50`}
              >
                {hLevelBundle.createMut.isPending ? "Adding..." : `+ Add ${hLevelDef.itemLabel}`}
              </button>
            </form>
            {hParentLevelDef && hParentItems.length === 0 && (
              <p className="text-[11px] font-bold text-amber-600 -mt-3 px-1">
                Add at least one {hParentLevelDef.itemLabel} first before creating a{" "}
                {hLevelDef.itemLabel.toLowerCase()}.
              </p>
            )}
            {hFormError && <p className="text-[11px] font-bold text-red-500 -mt-3 px-1">{hFormError}</p>}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="text-left px-5 py-3">{hLevelDef.itemLabel}</th>
                    <th className="text-left px-5 py-3 w-32">Code</th>
                    {hParentLevelDef && (
                      <th className="text-left px-5 py-3 w-64">Parent {hParentLevelDef.itemLabel}</th>
                    )}
                    <th className="text-right px-5 py-3 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hLevelBundle.isLoading && (
                    <tr>
                      <td colSpan={hParentLevelDef ? 4 : 3} className="px-5 py-10 text-center text-gray-400 font-medium">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!hLevelBundle.isLoading && hItems.length === 0 && (
                    <tr>
                      <td colSpan={hParentLevelDef ? 4 : 3} className="px-5 py-10 text-center text-gray-400 font-medium">
                        No items yet — add the first {hLevelDef.itemLabel.toLowerCase()} above.
                      </td>
                    </tr>
                  )}
                  {hItems.map((item) => {
                    const isEditing = hEditingId === item.id;
                    return (
                      <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                        <td className="px-5 py-3 align-top">
                          {isEditing ? (
                            <input
                              value={hEditName}
                              onChange={(e) => setHEditName(e.target.value)}
                              className="w-full bg-gray-50 rounded-lg p-2 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-gray-800">{item.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 align-top">
                          {isEditing ? (
                            <input
                              value={hEditCode}
                              onChange={(e) => setHEditCode(e.target.value)}
                              className="w-full bg-gray-50 rounded-lg p-2 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                            />
                          ) : (
                            <span className="font-mono font-bold text-gray-600">{item.code}</span>
                          )}
                        </td>
                        {hParentLevelDef && (
                          <td className="px-5 py-3 align-top">
                            {isEditing ? (
                              <select
                                value={hEditParentId}
                                onChange={(e) => setHEditParentId(e.target.value)}
                                className="w-full bg-gray-50 rounded-lg p-2 text-xs font-semibold border border-gray-200 outline-none focus:ring-2 focus:ring-offset-0"
                              >
                                <option value="">Select {hParentLevelDef.itemLabel}…</option>
                                {hParentItems.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} — {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-500">{hParentDisplay(item)}</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3 align-top">
                          {isEditing && hEditError && (
                            <p className="text-[10px] font-bold text-red-500 mb-1 text-right">{hEditError}</p>
                          )}
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveHEdit(item.id)}
                                  disabled={hLevelBundle.updateMut.isPending}
                                  className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                  {hLevelBundle.updateMut.isPending ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelHEdit}
                                  className="text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startHEdit(item)}
                                  className={`text-[11px] font-bold ${hAccent.text} ${hAccent.lightBg} hover:opacity-80 px-3 py-1.5 rounded-lg transition-all`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setHDeleteTarget(item)}
                                  className="text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hLevelBundle.total !== undefined && hLevelBundle.setPage && (
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-gray-400">
                  Page {hLevelBundle.page} of{" "}
                  {Math.max(1, Math.ceil(hLevelBundle.total / PAGE_SIZE))} ({hLevelBundle.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => hLevelBundle.setPage!(Math.max(1, (hLevelBundle.page ?? 1) - 1))}
                    disabled={hLevelBundle.page === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => hLevelBundle.setPage!((hLevelBundle.page ?? 1) + 1)}
                    disabled={(hLevelBundle.page ?? 1) >= Math.ceil(hLevelBundle.total / PAGE_SIZE)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </main>
        ) : null}
      </div>

      {/* DELETE CONFIRMATION MODAL — flat KPIs */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-black text-gray-900">Delete {config.itemLabel}?</h3>
            <p className="text-xs text-gray-500 mt-2">
              This will permanently remove{" "}
              <span className="font-bold text-gray-800">&quot;{deleteTarget.label}&quot;</span> from{" "}
              {config.title}. This action can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={bundle.deleteMut.isPending}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {bundle.deleteMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL — hierarchical KPIs (warns about cascading child deletes) */}
      {hDeleteTarget && hLevelDef && hLevelBundle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-sm font-black text-gray-900">Delete {hLevelDef.itemLabel}?</h3>
            <p className="text-xs text-gray-500 mt-2">
              This will permanently remove{" "}
              <span className="font-bold text-gray-800">
                &quot;{hDeleteTarget.code} — {hDeleteTarget.name}&quot;
              </span>
              . This action can&apos;t be undone.
            </p>
            {hDeleteDescendantCount > 0 && (
              <p className="text-xs font-bold text-red-500 mt-2">
                It also has {hDeleteDescendantCount} item{hDeleteDescendantCount === 1 ? "" : "s"} nested
                underneath it across the lower levels — those will be deleted too.
              </p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setHDeleteTarget(null)}
                className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleHDelete}
                disabled={hLevelBundle.deleteMut.isPending}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {hLevelBundle.deleteMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}