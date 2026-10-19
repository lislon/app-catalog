---
'@igstack/app-catalog-frontend-core': minor
---

The sub-resources table now shows its optional columns only where they apply.

- The AWS Account column appears only when at least one child carries an
  `extra.awsAccountId`. Families of other things (workflow namespaces, data
  projects) no longer get a column of dashes.
- A plugin can declare which parents its `resourceSubResourceRowActions`
  contribution serves, through the new `appliesTo` field on `AcPlugin`:

  ```ts
  const plugin: AcPlugin = {
    name: 'cloud-access',
    slots: { resourceSubResourceRowActions: (props) => <Cell {...props} /> },
    appliesTo: {
      resourceSubResourceRowActions: ({ parent }) => parent.slug === 'cloud',
    },
  }
  ```

  The Admin column then appears only on those parents' tables. A plugin without
  `appliesTo` keeps today's behaviour and serves every parent.
