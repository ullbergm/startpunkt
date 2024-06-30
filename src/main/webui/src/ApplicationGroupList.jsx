import { ApplicationGroup } from './ApplicationGroup'

export function ApplicationGroupList(props) {
  return (
    <div class="container px-4 py-5" id="icon-grid">
      {
        props.groups.map(
          (group) => (
            <ApplicationGroup group={group.name} applications={group.applications} />
          )
        )
      }
    </div>
  )
}
