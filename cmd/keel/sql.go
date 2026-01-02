package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/tyroneavnit/keel/internal/index"
)

var sqlCmd = &cobra.Command{
	Use:   "sql <query>",
	Short: "Execute read-only SQL against the decision index",
	Long: `Execute a SQL query directly against the SQLite index.

Schema:
  decisions (id, type, status, problem, choice, rationale, created_at, raw_json)
  decision_files (decision_id, file_path)
  decision_refs (decision_id, ref_id)
  decision_symbols (decision_id, symbol)

Examples:
  keel sql "SELECT raw_json FROM decisions WHERE status = 'active'"
  keel sql "SELECT * FROM decisions WHERE type = 'constraint'"
  keel sql "SELECT raw_json FROM decisions WHERE problem LIKE '%auth%'"
  keel sql "SELECT d.raw_json FROM decisions d JOIN decision_files df ON d.id = df.decision_id WHERE df.file_path LIKE '%billing%'"`,
	Args: cobra.ExactArgs(1),
	RunE: runSQL,
}

var sqlJSON bool

func init() {
	sqlCmd.Flags().BoolVar(&sqlJSON, "json", false, "Output as JSON array")
	rootCmd.AddCommand(sqlCmd)
}

func runSQL(cmd *cobra.Command, args []string) error {
	query := args[0]

	// Block write operations
	upperQuery := strings.ToUpper(strings.TrimSpace(query))
	if strings.HasPrefix(upperQuery, "INSERT") ||
		strings.HasPrefix(upperQuery, "UPDATE") ||
		strings.HasPrefix(upperQuery, "DELETE") ||
		strings.HasPrefix(upperQuery, "DROP") ||
		strings.HasPrefix(upperQuery, "ALTER") ||
		strings.HasPrefix(upperQuery, "CREATE") {
		return fmt.Errorf("only SELECT queries are allowed")
	}

	repoRoot, _ := os.Getwd()
	db, err := index.Open(repoRoot)
	if err != nil {
		return fmt.Errorf("failed to open index: %w", err)
	}
	defer db.Close()

	rows, err := db.Query(query)
	if err != nil {
		return fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return fmt.Errorf("failed to get columns: %w", err)
	}

	// Collect all results
	var results []map[string]interface{}
	for rows.Next() {
		// Create a slice of interface{} to hold each column
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}

		// Build map for this row
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			// Convert []byte to string for readability
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error iterating rows: %w", err)
	}

	if len(results) == 0 {
		fmt.Println("\033[2mNo results.\033[0m")
		return nil
	}

	if sqlJSON {
		output, _ := json.MarshalIndent(results, "", "  ")
		fmt.Println(string(output))
	} else {
		// Simple table output
		for i, row := range results {
			if len(columns) == 1 {
				// Single column - just print the value
				fmt.Println(row[columns[0]])
			} else {
				// Multiple columns - print as key: value pairs
				for _, col := range columns {
					fmt.Printf("\033[2m%s:\033[0m %v\n", col, row[col])
				}
			}
			if i < len(results)-1 {
				fmt.Println()
			}
		}
	}

	return nil
}
