# Feedback Data Schemas – JSON & CSV (Extended with Coordinates + Cursor Files)

This document extends the original schemas with **bounding box coordinates** for each annotation and lists the minimal set of files you should provide to Cursor to scaffold development.

---

## 1. JSON Schema

### 1.1 Structure

Each feedback item is represented as an object. A session file contains an array of feedback items along with metadata.

```json
{
  "file_id": "123.pdf",
  "reviewer_id": "user_01",
  "review_date": "2025-09-29T14:33:00Z",
  "feedback": [
    {
      "annotation_id": "ann_001",
      "page": 1,
      "span_text": "Metformin",
      "entity_type": "Medication",
      "feedback_type": "true_positive",
      "bbox": { "x": 120, "y": 340, "w": 80, "h": 15 },
      "notes": ""
    },
    {
      "annotation_id": "ann_002",
      "page": 2,
      "span_text": "Hypertension",
      "entity_type": "Diagnosis",
      "feedback_type": "false_positive",
      "bbox": { "x": 90, "y": 280, "w": 110, "h": 18 },
      "notes": "Wrong context"
    },
    {
      "annotation_id": "ann_003",
      "page": 5,
      "span_text": "Type 2 Diabetes",
      "entity_type": "Diagnosis",
      "feedback_type": "false_negative",
      "bbox": { "x": 70, "y": 450, "w": 150, "h": 20 },
      "notes": "Missed by pipeline"
    }
  ]
}
```

### 1.2 Field Definitions

* **bbox (object, optional):** Bounding box coordinates of annotation.

  * **x (int):** X coordinate (left).
  * **y (int):** Y coordinate (top).
  * **w (int):** Width.
  * **h (int):** Height.

---

## 2. CSV Schema

### 2.1 Structure

Each row represents one feedback item. Metadata fields are repeated on each row.

### 2.2 Columns

| Column        | Type   | Required | Description                                                  |
| ------------- | ------ | -------- | ------------------------------------------------------------ |
| file_id       | string | ✓        | PDF file identifier                                          |
| reviewer_id   | string |          | Reviewer identifier                                          |
| review_date   | string |          | ISO8601 timestamp                                            |
| annotation_id | string |          | Original annotation ID or generated for false negatives      |
| page          | int    | ✓        | Page number (1-indexed)                                      |
| span_text     | string | ✓        | Text span from PDF                                           |
| entity_type   | string | ✓        | Entity type (Diagnosis, Medication, etc.)                    |
| feedback_type | enum   | ✓        | true_positive / false_positive / false_negative / unreviewed |
| bbox_x        | int    |          | Left coordinate                                              |
| bbox_y        | int    |          | Top coordinate                                               |
| bbox_w        | int    |          | Width                                                        |
| bbox_h        | int    |          | Height                                                       |
| notes         | string |          | Free-text reviewer notes                                     |

### 2.3 Example Rows

| file_id | reviewer_id | review_date          | annotation_id | page | span_text       | entity_type | feedback_type  | bbox_x | bbox_y | bbox_w | bbox_h | notes              |
| ------- | ----------- | -------------------- | ------------- | ---- | --------------- | ----------- | -------------- | ------ | ------ | ------ | ------ | ------------------ |
| 123.pdf | user_01     | 2025-09-29T14:33:00Z | ann_001       | 1    | Metformin       | Medication  | true_positive  | 120    | 340    | 80     | 15     |                    |
| 123.pdf | user_01     | 2025-09-29T14:33:00Z | ann_002       | 2    | Hypertension    | Diagnosis   | false_positive | 90     | 280    | 110    | 18     | Wrong context      |
| 123.pdf | user_01     | 2025-09-29T14:33:00Z | ann_003       | 5    | Type 2 Diabetes | Diagnosis   | false_negative | 70     | 450    | 150    | 20     | Missed by pipeline |

---

## 3. Files to Provide to Cursor

When scaffolding the project in Cursor, provide these files/prompts:

1. **`PRD.md`** – The Product Requirements Document (PRD) we drafted earlier.
2. **`schemas.md`** – This JSON & CSV schema definition (with bounding boxes).
3. **`cursor_prompt_frontend.txt`** – Prompt instructing Cursor to scaffold React + PDF.js frontend with sidebar, annotation toggling, and feedback UI.
4. **`cursor_prompt_backend.txt`** – Prompt (optional, if sync/API needed) to scaffold Node/Express or Python/FastAPI backend with endpoints for uploading/downloading feedback JSON/CSV.
5. **`sample_feedback.json`** – A toy JSON file using this schema, for developers to test parsing and UI rendering.
6. **`sample_feedback.csv`** – Same as JSON but in tabular form, to validate CSV export pipeline.
7. **`sample.pdf`** – A short PDF file (3–5 pages) for rendering + annotation overlay testing.

---

## 4. Next Steps

1. Finalize controlled vocabulary of `entity_type`.
2. Decide whether coordinates should be absolute PDF units or normalized (0–1).
3. Import PRD + Schemas into Cursor with the prompts.
4. Generate frontend scaffold → test with `sample.pdf` + `sample_feedback.json`.
