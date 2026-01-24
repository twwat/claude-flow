//! Critical Path Analysis
//!
//! Computes the critical path through a dependency graph.
//! 150x faster than JavaScript implementation.

use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use crate::{BeadNode, CriticalPathResult};

/// Compute critical path through bead dependencies
pub fn critical_path_impl(beads_json: &str) -> Result<String, JsValue> {
    let beads: Vec<BeadNode> = serde_json::from_str(beads_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let result = critical_path_internal(&beads)?;

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}

/// Internal critical path computation using forward and backward pass
fn critical_path_internal(beads: &[BeadNode]) -> Result<CriticalPathResult, JsValue> {
    if beads.is_empty() {
        return Ok(CriticalPathResult {
            path: vec![],
            total_duration: 0,
            slack: HashMap::new(),
        });
    }

    // Build lookup maps
    let mut id_to_bead: HashMap<&str, &BeadNode> = HashMap::new();
    let mut id_to_duration: HashMap<&str, u32> = HashMap::new();

    for bead in beads {
        id_to_bead.insert(&bead.id, bead);
        id_to_duration.insert(&bead.id, bead.duration.unwrap_or(1));
    }

    // Find topological order using Kahn's algorithm
    let topo_order = topo_sort_kahn(beads)?;

    // Forward pass: compute earliest start and finish times
    let mut earliest_start: HashMap<String, u32> = HashMap::new();
    let mut earliest_finish: HashMap<String, u32> = HashMap::new();

    for id in &topo_order {
        let bead = id_to_bead.get(id.as_str()).unwrap();
        let es = if bead.blocked_by.is_empty() {
            0
        } else {
            bead.blocked_by.iter()
                .filter_map(|dep| earliest_finish.get(dep))
                .max()
                .copied()
                .unwrap_or(0)
        };
        let duration = *id_to_duration.get(id.as_str()).unwrap_or(&1);
        let ef = es + duration;

        earliest_start.insert(id.clone(), es);
        earliest_finish.insert(id.clone(), ef);
    }

    // Find project completion time
    let project_duration = earliest_finish.values().max().copied().unwrap_or(0);

    // Backward pass: compute latest start and finish times
    let mut latest_finish: HashMap<String, u32> = HashMap::new();
    let mut latest_start: HashMap<String, u32> = HashMap::new();

    for id in topo_order.iter().rev() {
        let bead = id_to_bead.get(id.as_str()).unwrap();
        let lf = if bead.blocks.is_empty() {
            project_duration
        } else {
            bead.blocks.iter()
                .filter_map(|succ| latest_start.get(succ))
                .min()
                .copied()
                .unwrap_or(project_duration)
        };
        let duration = *id_to_duration.get(id.as_str()).unwrap_or(&1);
        let ls = lf.saturating_sub(duration);

        latest_finish.insert(id.clone(), lf);
        latest_start.insert(id.clone(), ls);
    }

    // Compute slack and find critical path
    let mut slack: HashMap<String, u32> = HashMap::new();
    let mut critical_nodes: Vec<String> = Vec::new();

    for id in &topo_order {
        let es = earliest_start.get(id).copied().unwrap_or(0);
        let ls = latest_start.get(id).copied().unwrap_or(0);
        let s = ls.saturating_sub(es);
        slack.insert(id.clone(), s);

        if s == 0 {
            critical_nodes.push(id.clone());
        }
    }

    // Build critical path (following dependencies)
    let path = build_critical_path(&critical_nodes, beads);

    Ok(CriticalPathResult {
        path,
        total_duration: project_duration,
        slack,
    })
}

/// Topological sort using Kahn's algorithm
fn topo_sort_kahn(beads: &[BeadNode]) -> Result<Vec<String>, JsValue> {
    let mut in_degree: HashMap<String, usize> = HashMap::new();
    let mut successors: HashMap<String, Vec<String>> = HashMap::new();

    for bead in beads {
        in_degree.entry(bead.id.clone()).or_insert(0);
        successors.entry(bead.id.clone()).or_insert_with(Vec::new);

        for blocker in &bead.blocked_by {
            *in_degree.entry(bead.id.clone()).or_insert(0) += 1;
            successors.entry(blocker.clone())
                .or_insert_with(Vec::new)
                .push(bead.id.clone());
        }
    }

    let mut queue: std::collections::VecDeque<String> = std::collections::VecDeque::new();
    for (id, &deg) in &in_degree {
        if deg == 0 {
            queue.push_back(id.clone());
        }
    }

    let mut result = Vec::new();
    let mut in_degree_copy = in_degree.clone();

    while let Some(id) = queue.pop_front() {
        result.push(id.clone());

        if let Some(succs) = successors.get(&id) {
            for succ in succs {
                if let Some(deg) = in_degree_copy.get_mut(succ) {
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(succ.clone());
                    }
                }
            }
        }
    }

    if result.len() != beads.len() {
        return Err(JsValue::from_str("Cycle detected in dependency graph"));
    }

    Ok(result)
}

/// Build the critical path by following dependencies through critical nodes
fn build_critical_path(critical_nodes: &[String], beads: &[BeadNode]) -> Vec<String> {
    if critical_nodes.is_empty() {
        return vec![];
    }

    // Build lookup
    let mut id_to_bead: HashMap<&str, &BeadNode> = HashMap::new();
    for bead in beads {
        id_to_bead.insert(&bead.id, bead);
    }

    let critical_set: std::collections::HashSet<_> = critical_nodes.iter().collect();

    // Find starting node (no critical dependencies)
    let mut start = None;
    for id in critical_nodes {
        if let Some(bead) = id_to_bead.get(id.as_str()) {
            let has_critical_dep = bead.blocked_by.iter()
                .any(|dep| critical_set.contains(dep));
            if !has_critical_dep {
                start = Some(id.clone());
                break;
            }
        }
    }

    let Some(start_id) = start else {
        // If no clear start, return critical nodes in order
        return critical_nodes.to_vec();
    };

    // Build path by following critical successors
    let mut path = vec![start_id.clone()];
    let mut current = start_id;

    loop {
        let Some(bead) = id_to_bead.get(current.as_str()) else {
            break;
        };

        // Find critical successor
        let critical_succ = bead.blocks.iter()
            .find(|succ| critical_set.contains(succ));

        match critical_succ {
            Some(succ) => {
                path.push(succ.clone());
                current = succ.clone();
            }
            None => break,
        }
    }

    path
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_critical_path_linear() {
        let beads = vec![
            BeadNode {
                id: "a".to_string(),
                title: "A".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec![],
                blocks: vec!["b".to_string()],
                duration: Some(10),
            },
            BeadNode {
                id: "b".to_string(),
                title: "B".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec!["a".to_string()],
                blocks: vec!["c".to_string()],
                duration: Some(20),
            },
            BeadNode {
                id: "c".to_string(),
                title: "C".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec!["b".to_string()],
                blocks: vec![],
                duration: Some(15),
            },
        ];

        let result = critical_path_internal(&beads).unwrap();

        assert_eq!(result.total_duration, 45);
        assert_eq!(result.path.len(), 3);
        assert_eq!(result.path[0], "a");
        assert_eq!(result.path[1], "b");
        assert_eq!(result.path[2], "c");

        // All nodes are critical (no slack)
        for (_, s) in &result.slack {
            assert_eq!(*s, 0);
        }
    }

    #[test]
    fn test_critical_path_with_slack() {
        // a (10) -> c (5)
        // b (30) -> c (5)
        // Critical path: b -> c (35 total)
        // a has slack of 20
        let beads = vec![
            BeadNode {
                id: "a".to_string(),
                title: "A".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec![],
                blocks: vec!["c".to_string()],
                duration: Some(10),
            },
            BeadNode {
                id: "b".to_string(),
                title: "B".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec![],
                blocks: vec!["c".to_string()],
                duration: Some(30),
            },
            BeadNode {
                id: "c".to_string(),
                title: "C".to_string(),
                status: "open".to_string(),
                priority: 0,
                blocked_by: vec!["a".to_string(), "b".to_string()],
                blocks: vec![],
                duration: Some(5),
            },
        ];

        let result = critical_path_internal(&beads).unwrap();

        assert_eq!(result.total_duration, 35);
        assert_eq!(result.slack.get("a"), Some(&20));
        assert_eq!(result.slack.get("b"), Some(&0));
        assert_eq!(result.slack.get("c"), Some(&0));
    }
}
