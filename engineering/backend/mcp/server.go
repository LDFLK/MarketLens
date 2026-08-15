package mcpserver

import (
	"context"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"marketlens-go-backend/repositories"
)

// ---------------------------------------------------------------------------
// This package wires the existing JobRepository directly into MCP tools.
// Tools call repository methods in-process (no HTTP round-trip to the Go
// API's own routes), which is the whole point of building this inside the
// Go project rather than as a separate client hitting localhost:8080.
//
// FILE LAYOUT (matches your existing project tree):
//
//   mcp/
//   ├── server.go            (this file - core setup + generic helpers +
//   │                          simple reference-table tools)
//   ├── tools_hierarchy.go    (occupation/industry hierarchy CRUD-list tools
//   │                          + the generic children/breakdown tools)
//   ├── tools_analysis.go     (occupation skills, vacancy trend/total,
//   │                          date-range occupation/industry counts)
//   ├── tools_stats.go        (dashboard "active jobs by X" stats)
//   └── tools_crawler.go      (crawler run monitoring)
//
// main.go only needs two additions: build the server once via
// mcpserver.New(repo), then start its HTTP handler on its own port
// alongside your existing Gin server. See the wiring notes at the bottom
// of this file.
// ---------------------------------------------------------------------------

// New builds the MCP server and registers every read-only (GET-equivalent)
// tool against the given repository.
func New(repo *repositories.JobRepository) *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "marketlens-mcp",
		Version: "v1.0.0",
	}, nil)

	registerLookupTools(server, repo)
	registerHierarchyTools(server, repo)
	registerAnalysisTools(server, repo)
	registerStatsTools(server, repo)
	registerCrawlerTools(server, repo)

	return server
}

// StartHTTP serves the given MCP server over Streamable HTTP at addr
// (e.g. ":9090"). This is the transport ngrok should point at - MCP
// clients (including Claude.ai's custom connector setup) speak to this
// endpoint over plain HTTP/SSE, not stdio.
func StartHTTP(server *mcp.Server, addr string) error {
	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return server
	}, nil)

	mux := http.NewServeMux()
	mux.Handle("/mcp", handler)

	return http.ListenAndServe(addr, mux)
}

// ---------------------------------------------------------------------------
// GENERIC REGISTRATION HELPERS
// mcp.AddTool is itself generic - it derives the JSON input/output schema
// from the struct types you give it via `json`/`jsonschema` tags. These
// wrappers let every individual tool registration below collapse to a
// one-line call instead of hand-writing a full handler function each time.
// ---------------------------------------------------------------------------

// emptyInput is used for tools that take no parameters at all.
type emptyInput struct{}

// registerNoArgTool registers a tool that takes no input and returns
// whatever the given repository call returns.
func registerNoArgTool[T any](server *mcp.Server, name, description string, fn func() (T, error)) {
	mcp.AddTool(server, &mcp.Tool{Name: name, Description: description},
		func(_ context.Context, _ *mcp.CallToolRequest, _ emptyInput) (*mcp.CallToolResult, T, error) {
			out, err := fn()
			return nil, out, err
		},
	)
}

// idInput is used for tools scoped to a single numeric id (e.g. an
// industry_sector id, a major_group id).
type idInput struct {
	ID uint `json:"id" jsonschema:"the numeric id to look up"`
}

// registerIDTool registers a tool that takes a single "id" parameter.
func registerIDTool[T any](server *mcp.Server, name, description string, fn func(id uint) (T, error)) {
	mcp.AddTool(server, &mcp.Tool{Name: name, Description: description},
		func(_ context.Context, _ *mcp.CallToolRequest, in idInput) (*mcp.CallToolResult, T, error) {
			out, err := fn(in.ID)
			return nil, out, err
		},
	)
}

// dateRangeInput is used for tools scoped to a from/to date window.
type dateRangeInput struct {
	FromDate string `json:"from_date" jsonschema:"start date, format YYYY-MM-DD"`
	ToDate   string `json:"to_date" jsonschema:"end date, format YYYY-MM-DD"`
}

// idAndYearInput is used for the occupation-scoped year-filtered tools
// (by-formality, by-gender, top-job-roles).
type idAndYearInput struct {
	ID   uint `json:"id" jsonschema:"the numeric id to look up"`
	Year int  `json:"year" jsonschema:"the calendar year, e.g. 2026"`
}

// idAndDateRangeInput is used for tools scoped to both a single id and a
// from/to date window (e.g. industry-scoped year analytics).
type idAndDateRangeInput struct {
	ID       uint   `json:"id" jsonschema:"the numeric id to look up"`
	FromDate string `json:"from_date" jsonschema:"start date, format YYYY-MM-DD"`
	ToDate   string `json:"to_date" jsonschema:"end date, format YYYY-MM-DD"`
}

// ---------------------------------------------------------------------------
// SIMPLE REFERENCE-TABLE TOOLS
// Flat lookup tables with no filtering - straight passthrough to the
// existing GetAllX repository methods used by your KPI admin CRUD pages.
// ---------------------------------------------------------------------------

func registerLookupTools(server *mcp.Server, repo *repositories.JobRepository) {
	registerNoArgTool(server, "get_industries", "List all industries (top-level lookup table).",
		func() (any, error) { return repo.GetAllIndustries() })

	registerNoArgTool(server, "get_experiences", "List all experience levels.",
		func() (any, error) { return repo.GetAllExperiences() })

	registerNoArgTool(server, "get_provinces", "List all Sri Lankan provinces used for geo-tagging job posts.",
		func() (any, error) { return repo.GetAllProvinces() })

	registerNoArgTool(server, "get_job_types", "List all job types (Full Time, Part Time, Contract, Internship).",
		func() (any, error) { return repo.GetAllJobTypes() })

	registerNoArgTool(server, "get_sources", "List all crawl sources (e.g. Ikman, TopJobs) with their active job counts.",
		func() (any, error) { return repo.GetSourcesWithActiveJobCount() })

	registerNoArgTool(server, "get_employment_sectors", "List all employment sectors (Government, Private, NGO, etc.).",
		func() (any, error) { return repo.GetAllEmploymentSectors() })

	registerNoArgTool(server, "get_education_levels", "List all education level categories.",
		func() (any, error) { return repo.GetAllEducationLevels() })

	registerNoArgTool(server, "get_formalities", "List all formality categories (Formal / Informal sector).",
		func() (any, error) { return repo.GetAllFormalities() })

	registerNoArgTool(server, "get_genders", "List all gender categories used in job postings.",
		func() (any, error) { return repo.GetAllGenders() })

	registerNoArgTool(server, "get_vocational_educations", "List all vocational education (NVQ) levels.",
		func() (any, error) { return repo.GetAllVocationalEducations() })
}