package mcpserver

import (
	"context"
	"fmt"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"marketlens-go-backend/repositories"
)

// ---------------------------------------------------------------------------
// NOTE ON METHOD NAMES: the CRUD list/get-by-id methods below
// (GetAllMajorGroups, GetMajorGroupByID, etc.) follow the naming convention
// used consistently throughout job_repository.go for every other reference
// table in this project. If any of these don't match a method that
// actually exists (e.g. it's named GetMajorGroupById with lowercase "d"),
// just rename the call on the left of the dot - nothing else about the
// tool registration needs to change.
// ---------------------------------------------------------------------------

func registerHierarchyTools(server *mcp.Server, repo *repositories.JobRepository) {
	// ---- Occupation hierarchy: list + get-by-id ----

	registerNoArgTool(server, "get_major_groups", "List all occupation major groups (top level of the SLSO occupation hierarchy).",
		func() (any, error) { return repo.GetAllMajorGroups() })
	registerIDTool(server, "get_major_group", "Get a single occupation major group by id.",
		func(id uint) (any, error) { return repo.GetMajorGroupByID(id) })

	registerNoArgTool(server, "get_sub_major_groups", "List all occupation sub major groups.",
		func() (any, error) { return repo.GetAllSubMajorGroups() })
	registerIDTool(server, "get_sub_major_group", "Get a single occupation sub major group by id.",
		func(id uint) (any, error) { return repo.GetSubMajorGroupByID(id) })

	registerNoArgTool(server, "get_minor_groups", "List all occupation minor groups.",
		func() (any, error) { return repo.GetAllMinorGroups() })
	registerIDTool(server, "get_minor_group", "Get a single occupation minor group by id.",
		func(id uint) (any, error) { return repo.GetMinorGroupByID(id) })

	registerNoArgTool(server, "get_unit_groups", "List all occupation unit groups.",
		func() (any, error) { return repo.GetAllUnitGroups() })
	registerIDTool(server, "get_unit_group", "Get a single occupation unit group by id.",
		func(id uint) (any, error) { return repo.GetUnitGroupByID(id) })

	// Paginated - matches GetAllOccupationGroups(limit, offset int) (items, total, error)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_occupation_groups",
		Description: "List occupation groups (leaf level of the SLSO hierarchy), paginated.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, in struct {
		Limit  int `json:"limit" jsonschema:"max rows to return, default 20"`
		Offset int `json:"offset" jsonschema:"rows to skip, default 0"`
	}) (*mcp.CallToolResult, any, error) {
		limit := in.Limit
		if limit <= 0 {
			limit = 20
		}
		items, total, err := repo.GetAllOccupationGroups(limit, in.Offset)
		if err != nil {
			return nil, nil, err
		}
		return nil, map[string]any{"items": items, "total": total, "limit": limit, "offset": in.Offset}, nil
	})
	registerIDTool(server, "get_occupation_group", "Get a single occupation group by id.",
		func(id uint) (any, error) { return repo.GetOccupationGroupByID(id) })

	// ---- Industry hierarchy: list + get-by-id ----

	registerNoArgTool(server, "get_industry_sectors", "List all industry sectors (top level of the SLSIC industry hierarchy).",
		func() (any, error) { return repo.GetAllIndustrySectors() })
	registerIDTool(server, "get_industry_sector", "Get a single industry sector by id.",
		func(id uint) (any, error) { return repo.GetIndustrySectorByID(id) })

	registerNoArgTool(server, "get_industry_divisions", "List all industry divisions.",
		func() (any, error) { return repo.GetAllIndustryDivisions() })
	registerIDTool(server, "get_industry_division", "Get a single industry division by id.",
		func(id uint) (any, error) { return repo.GetIndustryDivisionByID(id) })

	registerNoArgTool(server, "get_industry_groups", "List all industry groups.",
		func() (any, error) { return repo.GetAllIndustryGroups() })
	registerIDTool(server, "get_industry_group", "Get a single industry group by id.",
		func(id uint) (any, error) { return repo.GetIndustryGroupByID(id) })

	registerNoArgTool(server, "get_industry_classes", "List all industry classes.",
		func() (any, error) { return repo.GetAllIndustryClasses() })
	registerIDTool(server, "get_industry_class", "Get a single industry class by id.",
		func(id uint) (any, error) { return repo.GetIndustryClassByID(id) })

	// Paginated - matches GetAllIndustrySubclasses(limit, offset int) (items, total, error)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_industry_subclasses",
		Description: "List industry subclasses (leaf level of the SLSIC hierarchy), paginated.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, in struct {
		Limit  int `json:"limit" jsonschema:"max rows to return, default 20"`
		Offset int `json:"offset" jsonschema:"rows to skip, default 0"`
	}) (*mcp.CallToolResult, any, error) {
		limit := in.Limit
		if limit <= 0 {
			limit = 20
		}
		items, total, err := repo.GetAllIndustrySubclasses(limit, in.Offset)
		if err != nil {
			return nil, nil, err
		}
		return nil, map[string]any{"items": items, "total": total, "limit": limit, "offset": in.Offset}, nil
	})
	registerIDTool(server, "get_industry_subclass", "Get a single industry subclass by id.",
		func(id uint) (any, error) { return repo.GetIndustrySubclassByID(id) })

	// ---- Generic hierarchy analysis tools ----
	// These mirror the /api/v1/:standard/:level/:id/:analysisType routes -
	// "standard" is "occupation" or "industry", "level" is one of the five
	// level names for that standard (e.g. "major-group", "industry-sector").

	registerChildrenTool(server, repo)
	registerLevelBreakdownTool(server, "get_total_job_count_by_level",
		"Get the total vacancy count for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetTotalJobCountByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_employment_sector_by_level",
		"Get employment sector breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetEmploymentSectorByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_experience_by_level",
		"Get experience-level breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetExperienceByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_province_by_level",
		"Get province breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetProvinceByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_education_by_level",
		"Get education level breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetEducationLevelByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_formality_by_level",
		"Get formal/informal breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetFormalityByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_gender_by_level",
		"Get gender breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetGenderByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_vocational_education_by_level",
		"Get vocational education (NVQ) breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetVocationalEducationByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_remote_onsite_by_level",
		"Get remote vs on-site job counts for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetRemoteOnSiteByLevel(standard, level, id, from, to)
		})
	registerLevelBreakdownTool(server, "get_job_type_by_level",
		"Get job type breakdown for a given occupation/industry hierarchy level and id, within a date range.",
		func(standard, level string, id uint, from, to time.Time) (any, error) {
			return repo.GetJobTypeByLevel(standard, level, id, from, to)
		})
}

// levelInput mirrors the /:standard/:level/:id/... path params, plus the
// from/to date query params every breakdown endpoint requires.
type levelInput struct {
	Standard string `json:"standard" jsonschema:"'occupation' or 'industry'"`
	Level    string `json:"level" jsonschema:"the hierarchy level name, e.g. 'major-group' or 'industry-sector'"`
	ID       uint   `json:"id" jsonschema:"the numeric id at that level"`
	FromDate string `json:"from_date" jsonschema:"start date, format YYYY-MM-DD"`
	ToDate   string `json:"to_date" jsonschema:"end date, format YYYY-MM-DD"`
}

// parseLevelInput validates and parses the shared standard/level/id/date
// fields used by every generic breakdown tool.
func parseLevelInput(in levelInput) (uint, time.Time, time.Time, error) {
	if in.Standard != "occupation" && in.Standard != "industry" {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("invalid standard %q, must be 'occupation' or 'industry'", in.Standard)
	}
	if in.FromDate == "" || in.ToDate == "" {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("from_date and to_date are both required (format YYYY-MM-DD)")
	}
	from, err := time.Parse("2006-01-02", in.FromDate)
	if err != nil {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("invalid from_date: %w", err)
	}
	to, err := time.Parse("2006-01-02", in.ToDate)
	if err != nil {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("invalid to_date: %w", err)
	}
	if to.Before(from) {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("to_date must not be before from_date")
	}
	return in.ID, from, to, nil
}

// registerLevelBreakdownTool registers one of the ten generic
// standard/level/id breakdown tools, given the repository call it should
// dispatch to.
func registerLevelBreakdownTool(
	server *mcp.Server,
	name, description string,
	fn func(standard, level string, id uint, from, to time.Time) (any, error),
) {
	mcp.AddTool(server, &mcp.Tool{Name: name, Description: description},
		func(_ context.Context, _ *mcp.CallToolRequest, in levelInput) (*mcp.CallToolResult, any, error) {
			id, from, to, err := parseLevelInput(in)
			if err != nil {
				return nil, nil, err
			}
			out, err := fn(in.Standard, in.Level, id, from, to)
			return nil, out, err
		},
	)
}

// registerChildrenTool registers the "get the next level down" tool
// (mirrors GET /:standard/:level/:id/children).
func registerChildrenTool(server *mcp.Server, repo *repositories.JobRepository) {
	mcp.AddTool(server, &mcp.Tool{
		Name: "get_hierarchy_children",
		Description: "Get the immediate child-level entities under a given occupation/industry hierarchy " +
			"level and id, each with its aggregated job count for a date range. Fails for leaf levels " +
			"('occupation-group', 'industry-subclass'), which have no children.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, in levelInput) (*mcp.CallToolResult, any, error) {
		id, from, to, err := parseLevelInput(in)
		if err != nil {
			return nil, nil, err
		}
		items, childLevel, err := repo.GetLevelChildren(in.Standard, in.Level, id, from, to)
		if err != nil {
			return nil, nil, err
		}
		return nil, map[string]any{"child_level": childLevel, "children": items}, nil
	})
}