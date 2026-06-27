# Load all kitchen executor modules in dependency order
# This loader is for SketchUp 2026 embedded Ruby (remove untaint for Ruby 3.x compatibility)
load_dir = File.dirname(File.expand_path(__FILE__))

files = %w[
  kitchen_component_registry
  kitchen_component_builder
  kitchen_geometry
  kitchen_artifact_publisher
  kitchen_easykitchen_adapter
  kitchen_update_in_place
  kitchen_plan_validator
  kitchen_executor
]

files.each { |f| load File.join(load_dir, "#{f}.rb") }

puts "FurniturePlatform::KitchenExecutor loaded — ready for run(queue_dir:, job_id:)"
