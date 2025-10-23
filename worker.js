// Cloudflare Worker 脚本：定时更新 CDN IP 到你的域名

export default {
  async scheduled(event, env, ctx) {
    // 优质 CDN 域名列表（替换为实际收集的优质 CDN 域名）
    const cdnDomains = [
      'cdn1.example.com',
      'cdn2.example.com',
      // 添加更多优质 CDN 域名...
    ];

    // 解析所有域名获取 IP
    const ips = await parseDomainsToIPs(cdnDomains);

    // 更新 DNS
    await updateDNS(env, ips);
  },
};

async function parseDomainsToIPs(domains) {
  const ipv4Set = new Set();
  const ipv6Set = new Set();

  for (const domain of domains) {
    try {
      // 使用 Cloudflare DoH API 解析 A (IPv4)
      const ipv4Response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
        headers: { 'Accept': 'application/dns-json' },
      });
      const ipv4Data = await ipv4Response.json();
      if (ipv4Data.Answer) {
        ipv4Data.Answer.forEach(ans => {
          if (ans.type === 1) ipv4Set.add(ans.data); // A 记录
        });
      }

      // 解析 AAAA (IPv6)
      const ipv6Response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=AAAA`, {
        headers: { 'Accept': 'application/dns-json' },
      });
      const ipv6Data = await ipv6Response.json();
      if (ipv6Data.Answer) {
        ipv6Data.Answer.forEach(ans => {
          if (ans.type === 28) ipv6Set.add(ans.data); // AAAA 记录
        });
      }
    } catch (error) {
      console.error(`解析 ${domain} 失败:`, error);
    }
  }

  return {
    ipv4: Array.from(ipv4Set),
    ipv6: Array.from(ipv6Set),
  };
}

async function updateDNS(env, ips) {
  const apiToken = env.CF_API_TOKEN;
  const zoneId = env.ZONE_ID;
  const subdomain = env.SUBDOMAIN || 'cdn'; // 'cdn' 对应 cdn.qmqm.cf

  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };

  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

  // 步骤1: 获取并删除旧 A 记录
  const aListUrl = `${baseUrl}?name=${subdomain}&type=A`;
  const aListResponse = await fetch(aListUrl, { headers });
  const aListData = await aListResponse.json();
  if (aListData.success && aListData.result.length > 0) {
    for (const record of aListData.result) {
      const deleteUrl = `${baseUrl}/${record.id}`;
      await fetch(deleteUrl, { method: 'DELETE', headers });
      console.log(`删除旧 A 记录: ${record.id}`);
    }
  }

  // 步骤1: 获取并删除旧 AAAA 记录
  const aaaaListUrl = `${baseUrl}?name=${subdomain}&type=AAAA`;
  const aaaaListResponse = await fetch(aaaaListUrl, { headers });
  const aaaaListData = await aaaaListResponse.json();
  if (aaaaListData.success && aaaaListData.result.length > 0) {
    for (const record of aaaaListData.result) {
      const deleteUrl = `${baseUrl}/${record.id}`;
      await fetch(deleteUrl, { method: 'DELETE', headers });
      console.log(`删除旧 AAAA 记录: ${record.id}`);
    }
  }

  // 步骤2: 添加新 IPv4 记录 (A 类型)
  for (const ip of ips.ipv4) {
    const createData = {
      type: 'A',
      name: subdomain,
      content: ip,
      ttl: 1, // 自动 TTL (1 表示 Auto)
      proxied: false, // 不代理，直接返回 IP
    };
    await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(createData) });
    console.log(`添加 A 记录: ${ip}`);
  }

  // 步骤3: 添加新 IPv6 记录 (AAAA 类型)
  for (const ip of ips.ipv6) {
    const createData = {
      type: 'AAAA',
      name: subdomain,
      content: ip,
      ttl: 1,
      proxied: false,
    };
    await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(createData) });
    console.log(`添加 AAAA 记录: ${ip}`);
  }

  console.log(`DNS 更新完成: ${ips.ipv4.length} 个 IPv4, ${ips.ipv6.length} 个 IPv6`);
}
